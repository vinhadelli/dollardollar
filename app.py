import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import calendar
from functools import wraps
import logging
from sqlalchemy import func, or_, and_
import json
import secrets
from datetime import timedelta
from flask_mail import Mail, Message
from flask_migrate import Migrate


#--------------------
# SETUP AND CONFIGURATION
#--------------------

# Load environment variables
load_dotenv()

# Development mode configuration
app = Flask(__name__)

# Configure from environment variables with sensible defaults
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'fallback_secret_key_change_in_production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:///instance/expenses.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['DEVELOPMENT_MODE'] = os.getenv('DEVELOPMENT_MODE', 'True').lower() == 'true'
app.config['DISABLE_SIGNUPS'] = os.environ.get('DISABLE_SIGNUPS', 'False').lower() == 'true'  # Default to allowing signups


# Email configuration from environment variables
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'False').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', os.getenv('MAIL_USERNAME'))



mail = Mail(app)


# Logging configuration
log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(level=getattr(logging, log_level))

# Development user credentials from environment
DEV_USER_EMAIL = os.getenv('DEV_USER_EMAIL', 'dev@example.com')
DEV_USER_PASSWORD = os.getenv('DEV_USER_PASSWORD', 'dev')

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'


migrate = Migrate(app, db)
#--------------------
# DATABASE MODELS
#--------------------

# Group-User Association Table
group_users = db.Table('group_users',
    db.Column('group_id', db.Integer, db.ForeignKey('groups.id'), primary_key=True),
    db.Column('user_id', db.String(120), db.ForeignKey('users.id'), primary_key=True)
)

class Group(db.Model):
    __tablename__ = 'groups'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(120), db.ForeignKey('users.id'), nullable=False)
    members = db.relationship('User', secondary=group_users, lazy='subquery',
        backref=db.backref('groups', lazy=True))
    expenses = db.relationship('Expense', backref='group', lazy=True)

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(120), primary_key=True)  # Using email as ID
    password_hash = db.Column(db.String(256))
    name = db.Column(db.String(100))
    is_admin = db.Column(db.Boolean, default=False)
    reset_token = db.Column(db.String(100), nullable=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)
    expenses = db.relationship('Expense', backref='user', lazy=True)
    created_groups = db.relationship('Group', backref='creator', lazy=True,
        foreign_keys=[Group.created_by])

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
        
    def generate_reset_token(self):
        """Generate a password reset token that expires in 1 hour"""
        self.reset_token = secrets.token_urlsafe(32)
        self.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
        return self.reset_token
        
    def verify_reset_token(self, token):
        """Verify if the provided token is valid and not expired"""
        if not self.reset_token or self.reset_token != token:
            return False
        if not self.reset_token_expiry or self.reset_token_expiry < datetime.utcnow():
            return False
        return True
        
    def clear_reset_token(self):
        """Clear the reset token and expiry after use"""
        self.reset_token = None
        self.reset_token_expiry = None

class Settlement(db.Model):
    __tablename__ = 'settlements'
    id = db.Column(db.Integer, primary_key=True)
    payer_id = db.Column(db.String(120), db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.String(120), db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    description = db.Column(db.String(200), nullable=True, default="Settlement")
    
    # Relationships
    payer = db.relationship('User', foreign_keys=[payer_id], backref=db.backref('settlements_paid', lazy=True))
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref=db.backref('settlements_received', lazy=True))

class Expense(db.Model):
    __tablename__ = 'expenses'
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    card_used = db.Column(db.String(50), nullable=False)
    split_method = db.Column(db.String(20), nullable=False)  # 'equal', 'custom', 'percentage'
    split_value = db.Column(db.Float)  # deprecated - kept for backward compatibility
    paid_by = db.Column(db.String(50), nullable=False)
    user_id = db.Column(db.String(120), db.ForeignKey('users.id'), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=True)
    split_with = db.Column(db.String(500), nullable=True)  # Comma-separated list of user IDs
    split_details = db.Column(db.Text, nullable=True)  # JSON string storing custom split values for each user

    def calculate_splits(self):
        import json
        
        # Get the user who paid
        payer = User.query.filter_by(id=self.paid_by).first()
        payer_name = payer.name if payer else "Unknown"
        payer_email = payer.id
        
        # Get all people this expense is split with
        split_with_ids = self.split_with.split(',') if self.split_with else []
        split_users = []
        
        for user_id in split_with_ids:
            user = User.query.filter_by(id=user_id.strip()).first()
            if user:
                split_users.append({
                    'id': user.id,
                    'name': user.name,
                    'email': user.id
                })
        
        # Set up result structure
        result = {
            'payer': {
                'name': payer_name, 
                'email': payer_email,
                'amount': 0  # Will calculate below
            },
            'splits': []
        }
        
        # Parse split details if available
        split_details = {}
        if self.split_details:
            try:
                split_details = json.loads(self.split_details)
            except:
                split_details = {}
        
        if self.split_method == 'equal':
            # Count participants (include payer only if not already in splits)
            total_participants = len(split_users) + (1 if self.paid_by not in split_with_ids else 0)
            
            # Equal splits among all participants
            per_person = self.amount / total_participants if total_participants > 0 else 0
            
            # Assign payer's portion (only if they're not already in the splits)
            if self.paid_by not in split_with_ids:
                result['payer']['amount'] = per_person
            else:
                result['payer']['amount'] = 0
            
            # Assign everyone else's portion
            for user in split_users:
                result['splits'].append({
                    'name': user['name'],
                    'email': user['email'],
                    'amount': per_person
                })
                
        elif self.split_method == 'percentage':
            # Use per-user percentages if available in split_details
            if split_details and split_details.get('type') == 'percentage':
                percentages = split_details.get('values', {})
                total_assigned = 0
                
                # Calculate payer's amount if specified
                payer_percent = float(percentages.get(self.paid_by, 0))
                payer_amount = (self.amount * payer_percent) / 100
                result['payer']['amount'] = payer_amount if self.paid_by not in split_with_ids else 0
                total_assigned += payer_amount if self.paid_by not in split_with_ids else 0
                
                # Calculate each user's portion based on their percentage
                for user in split_users:
                    user_percent = float(percentages.get(user['id'], 0))
                    user_amount = (self.amount * user_percent) / 100
                    result['splits'].append({
                        'name': user['name'],
                        'email': user['email'],
                        'amount': user_amount
                    })
                    total_assigned += user_amount
                
                # Validate total (handle rounding errors)
                if abs(total_assigned - self.amount) > 0.01:
                    # Adjust last split to make it add up
                    difference = self.amount - total_assigned
                    if result['splits']:
                        result['splits'][-1]['amount'] += difference
                    elif result['payer']['amount'] > 0:
                        result['payer']['amount'] += difference
            else:
                # Backward compatibility mode
                payer_percentage = self.split_value if self.split_value is not None else 0
                payer_amount = (self.amount * payer_percentage) / 100
                
                result['payer']['amount'] = payer_amount if self.paid_by not in split_with_ids else 0
                
                # Split remainder equally
                remaining = self.amount - result['payer']['amount']
                per_person = remaining / len(split_users) if split_users else 0
                
                for user in split_users:
                    result['splits'].append({
                        'name': user['name'],
                        'email': user['email'],
                        'amount': per_person
                    })
                
        elif self.split_method == 'custom':
            # Use per-user custom amounts if available in split_details
            if split_details and split_details.get('type') == 'amount':
                amounts = split_details.get('values', {})
                total_assigned = 0
                
                # Set payer's amount if specified
                payer_amount = float(amounts.get(self.paid_by, 0))
                result['payer']['amount'] = payer_amount if self.paid_by not in split_with_ids else 0
                total_assigned += payer_amount if self.paid_by not in split_with_ids else 0
                
                # Set each user's amount
                for user in split_users:
                    user_amount = float(amounts.get(user['id'], 0))
                    result['splits'].append({
                        'name': user['name'],
                        'email': user['email'],
                        'amount': user_amount
                    })
                    total_assigned += user_amount
                
                # Validate total (handle rounding errors)
                if abs(total_assigned - self.amount) > 0.01:
                    # Adjust last split to make it add up
                    difference = self.amount - total_assigned
                    if result['splits']:
                        result['splits'][-1]['amount'] += difference
                    elif result['payer']['amount'] > 0:
                        result['payer']['amount'] += difference
            else:
                # Backward compatibility mode
                payer_amount = self.split_value if self.split_value is not None else 0
                
                result['payer']['amount'] = payer_amount if self.paid_by not in split_with_ids else 0
                
                # Split remainder equally
                remaining = self.amount - result['payer']['amount']
                per_person = remaining / len(split_users) if split_users else 0
                
                for user in split_users:
                    result['splits'].append({
                        'name': user['name'],
                        'email': user['email'],
                        'amount': per_person
                    })
        
        return result

#--------------------
# AUTH AND UTILITIES
#--------------------

def login_required_dev(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if app.config['DEVELOPMENT_MODE']:
            if not current_user.is_authenticated:
                # Get or create dev user
                dev_user = User.query.filter_by(id=DEV_USER_EMAIL).first()
                if not dev_user:
                    dev_user = User(
                        id=DEV_USER_EMAIL,
                        name='Developer',
                        is_admin=True
                    )
                    dev_user.set_password(DEV_USER_PASSWORD)
                    db.session.add(dev_user)
                    db.session.commit()
                # Auto login dev user
                login_user(dev_user)
            return f(*args, **kwargs)
        # Normal authentication for non-dev mode - fixed implementation
        return login_required(f)(*args, **kwargs)
    return decorated_function

@login_manager.user_loader
def load_user(id):
    return User.query.filter_by(id=id).first()

def init_db():
    """Initialize the database"""
    with app.app_context():
        db.drop_all()  # This will drop all existing tables
        db.create_all()  # This will create new tables with current schema
        print("Database initialized successfully!")
        
        # Create dev user in development mode
        if app.config['DEVELOPMENT_MODE']:
            dev_user = User(
                id=DEV_USER_EMAIL,
                name='Developer',
                is_admin=True
            )
            dev_user.set_password(DEV_USER_PASSWORD)
            db.session.add(dev_user)
            db.session.commit()
            print("Development user created:", DEV_USER_EMAIL)

#--------------------
# BUSINESS LOGIC FUNCTIONS
#--------------------

def calculate_iou_data(expenses, users):
    """Calculate who owes whom money based on expenses"""
    # Initialize data structure
    iou_data = {
        'owes_me': {},  # People who owe current user
        'i_owe': {},    # People current user owes
        'net_balance': 0  # Overall balance (positive if owed money)
    }
    
    # Calculate balances
    for expense in expenses:
        splits = expense.calculate_splits()
        payer = splits['payer']
        payer_id = payer['email']
        payer_name = payer['name']
        
        # If current user paid
        if payer_id == current_user.id:
            # Track what others owe current user
            for split in splits['splits']:
                user_id = split['email']
                user_name = split['name']
                amount = split['amount']
                
                if user_id not in iou_data['owes_me']:
                    iou_data['owes_me'][user_id] = {'name': user_name, 'amount': 0}
                iou_data['owes_me'][user_id]['amount'] += amount
                
        # If someone else paid
        else:
            # Find current user's split if they're involved
            for split in splits['splits']:
                if split['email'] == current_user.id:
                    if payer_id not in iou_data['i_owe']:
                        iou_data['i_owe'][payer_id] = {'name': payer_name, 'amount': 0}
                    iou_data['i_owe'][payer_id]['amount'] += split['amount']
    
    # Calculate net balance
    total_owed = sum(data['amount'] for data in iou_data['owes_me'].values())
    total_owing = sum(data['amount'] for data in iou_data['i_owe'].values())
    iou_data['net_balance'] = total_owed - total_owing
    
    return iou_data
def calculate_balances(user_id):
    """Calculate balances between the current user and all other users"""
    balances = {}
    
    # Step 1: Calculate balances from expenses
    expenses = Expense.query.filter(
        or_(
            Expense.paid_by == user_id,
            Expense.split_with.like(f'%{user_id}%')
        )
    ).all()
    
    for expense in expenses:
        splits = expense.calculate_splits()
        
        # If current user paid for the expense
        if expense.paid_by == user_id:
            # Add what others owe to current user
            for split in splits['splits']:
                other_user_id = split['email']
                if other_user_id != user_id:
                    if other_user_id not in balances:
                        other_user = User.query.filter_by(id=other_user_id).first()
                        balances[other_user_id] = {
                            'user_id': other_user_id,
                            'name': other_user.name if other_user else 'Unknown',
                            'email': other_user_id,
                            'amount': 0
                        }
                    balances[other_user_id]['amount'] += split['amount']
        else:
            # If someone else paid and current user owes them
            payer_id = expense.paid_by
            
            # Find current user's portion
            current_user_portion = 0
            
            # Check if current user is in the splits
            for split in splits['splits']:
                if split['email'] == user_id:
                    current_user_portion = split['amount']
                    break
            
            if current_user_portion > 0:
                if payer_id not in balances:
                    payer = User.query.filter_by(id=payer_id).first()
                    balances[payer_id] = {
                        'user_id': payer_id,
                        'name': payer.name if payer else 'Unknown',
                        'email': payer_id,
                        'amount': 0
                    }
                balances[payer_id]['amount'] -= current_user_portion
    
    # Step 2: Adjust balances based on settlements
    settlements = Settlement.query.filter(
        or_(
            Settlement.payer_id == user_id,
            Settlement.receiver_id == user_id
        )
    ).all()
    
    for settlement in settlements:
        if settlement.payer_id == user_id:
            # Current user paid money to someone else
            other_user_id = settlement.receiver_id
            if other_user_id not in balances:
                other_user = User.query.filter_by(id=other_user_id).first()
                balances[other_user_id] = {
                    'user_id': other_user_id,
                    'name': other_user.name if other_user else 'Unknown',
                    'email': other_user_id,
                    'amount': 0
                }
            # FIX: When current user pays someone, it INCREASES how much they owe the current user
            # Change from -= to += 
            balances[other_user_id]['amount'] += settlement.amount
            
        elif settlement.receiver_id == user_id:
            # Current user received money from someone else
            other_user_id = settlement.payer_id
            if other_user_id not in balances:
                other_user = User.query.filter_by(id=other_user_id).first()
                balances[other_user_id] = {
                    'user_id': other_user_id,
                    'name': other_user.name if other_user else 'Unknown',
                    'email': other_user_id,
                    'amount': 0
                }
            # FIX: When current user receives money, it DECREASES how much they're owed
            # Change from += to -=
            balances[other_user_id]['amount'] -= settlement.amount
    
    # Return only non-zero balances
    return [balance for balance in balances.values() if abs(balance['amount']) > 0.01]

#--------------------
# ROUTES: AUTHENTICATION
#--------------------

@app.route('/')
def home():
    if app.config['DEVELOPMENT_MODE']:
        return redirect(url_for('dashboard'))
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/signup', methods=['GET', 'POST'])
def signup():
     # Check if signups are disabled
    if app.config['DISABLE_SIGNUPS'] and not app.config['DEVELOPMENT_MODE']:
        flash('New account registration is currently disabled.')
        return redirect(url_for('login'))
    
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        name = request.form.get('name')
        
        if User.query.filter_by(id=email).first():
            flash('Email already registered')
            return redirect(url_for('signup'))
        
        user = User(id=email, name=name)
        user.set_password(password)
        
        # Make first user admin
        if User.query.count() == 0:
            user.is_admin = True
        
        db.session.add(user)
        db.session.commit()
        
        login_user(user)
        flash('Account created successfully!')
        return redirect(url_for('dashboard'))
    
    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if app.config['DEVELOPMENT_MODE']:
        # In development mode, auto-login as dev user
        dev_user = User.query.filter_by(id=DEV_USER_EMAIL).first()
        if dev_user:
            login_user(dev_user)
            return redirect(url_for('dashboard'))
    
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(id=email).first()
        
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('dashboard'))
        
        flash('Invalid email or password')
    # Pass the signup status to the template
    return render_template('login.html', signups_disabled=app.config['DISABLE_SIGNUPS'])

@app.route('/logout')
@login_required_dev
def logout():
    logout_user()
    return redirect(url_for('login'))

#--------------------
# ROUTES: DASHBOARD
#--------------------
@app.route('/dashboard')
@login_required_dev
def dashboard():
    now = datetime.now()
    expenses = Expense.query.filter_by(user_id=current_user.id).order_by(Expense.date.desc()).all()
    users = User.query.all()
    groups = Group.query.join(group_users).filter(group_users.c.user_id == current_user.id).all()
    
    # Calculate monthly totals with contributors
    monthly_totals = {}
    if expenses:
        for expense in expenses:
            month_key = expense.date.strftime('%Y-%m')
            if month_key not in monthly_totals:
                monthly_totals[month_key] = {
                    'total': 0.0,
                    'by_card': {},
                    'contributors': {}
                }
            
            # Add to total
            monthly_totals[month_key]['total'] += expense.amount
            
            # Add to card totals
            if expense.card_used not in monthly_totals[month_key]['by_card']:
                monthly_totals[month_key]['by_card'][expense.card_used] = 0
            monthly_totals[month_key]['by_card'][expense.card_used] += expense.amount
            
            # Calculate splits and add to contributors
            splits = expense.calculate_splits()
            
            # Add payer's portion
            if splits['payer']['amount'] > 0:
                payer_email = splits['payer']['email']
                if payer_email not in monthly_totals[month_key]['contributors']:
                    monthly_totals[month_key]['contributors'][payer_email] = 0
                monthly_totals[month_key]['contributors'][payer_email] += splits['payer']['amount']
            
            # Add other contributors' portions
            for split in splits['splits']:
                if split['email'] not in monthly_totals[month_key]['contributors']:
                    monthly_totals[month_key]['contributors'][split['email']] = 0
                monthly_totals[month_key]['contributors'][split['email']] += split['amount']
    
    # Calculate total expenses
    total_expenses = sum(data['total'] for data in monthly_totals.values())
    
    # Calculate current month total
    current_month_key = now.strftime('%Y-%m')
    current_month_total = monthly_totals.get(current_month_key, {}).get('total', 0)
    
    # Get unique cards
    unique_cards = set(expense.card_used for expense in expenses)
    
    # Calculate IOUs
    iou_data = calculate_iou_data(expenses, users)
    
    # Pre-calculate expense splits to avoid repeated calculations in template
    expense_splits = {}
    for expense in expenses:
        expense_splits[expense.id] = expense.calculate_splits()
    
    return render_template('dashboard.html', 
                         expenses=expenses,
                         expense_splits=expense_splits,
                         monthly_totals=monthly_totals,
                         total_expenses=total_expenses,
                         current_month_total=current_month_total,
                         unique_cards=unique_cards,
                         users=users,
                         groups=groups,
                         iou_data=iou_data,
                         now=now)

@app.route('/add_expense', methods=['GET', 'POST'])
@login_required_dev
def add_expense():
    print("Request method:", request.method)
    if request.method == 'POST':
        print("Form data:", request.form)
        
        try:
            # Handle multi-select for split_with
            split_with_ids = request.form.getlist('split_with')
            split_with_str = ','.join(split_with_ids) if split_with_ids else None
            
            # Parse date with error handling
            try:
                expense_date = datetime.strptime(request.form['date'], '%Y-%m-%d')
            except ValueError:
                flash('Invalid date format. Please use YYYY-MM-DD format.')
                return redirect(url_for('dashboard'))
            
            # Process split details if provided
            split_details = None
            if request.form.get('split_details'):
                import json
                split_details = request.form.get('split_details')
            
            # Get form data
            expense = Expense(
                description=request.form['description'],
                amount=float(request.form['amount']),
                date=expense_date,
                card_used=request.form['card_used'],
                split_method=request.form['split_method'],
                split_value=float(request.form.get('split_value', 0)) if request.form.get('split_value') else 0,
                paid_by=request.form['paid_by'],
                user_id=current_user.id,
                group_id=request.form.get('group_id') if request.form.get('group_id') else None,
                split_with=split_with_str,  # Store as comma-separated string
                split_details=split_details  # Store the JSON string
            )
            
            db.session.add(expense)
            db.session.commit()
            flash('Expense added successfully!')
            print("Expense added successfully")
            
        except Exception as e:
            print("Error adding expense:", str(e))
            flash(f'Error: {str(e)}')
            
    return redirect(url_for('dashboard'))

#--------------------
# ROUTES: GROUPS
#--------------------

@app.route('/groups')
@login_required_dev
def groups():
    groups = Group.query.join(group_users).filter(group_users.c.user_id == current_user.id).all()
    all_users = User.query.all()
    return render_template('groups.html', groups=groups, users=all_users)

@app.route('/groups/create', methods=['POST'])
@login_required_dev
def create_group():
    try:
        name = request.form.get('name')
        description = request.form.get('description')
        member_ids = request.form.getlist('members')
        
        group = Group(
            name=name,
            description=description,
            created_by=current_user.id
        )
        
        # Add creator as a member
        group.members.append(current_user)
        
        # Add selected members
        for member_id in member_ids:
            user = User.query.filter_by(id=member_id).first()
            if user and user != current_user:
                group.members.append(user)
        
        db.session.add(group)
        db.session.commit()
        flash('Group created successfully!')
    except Exception as e:
        flash(f'Error creating group: {str(e)}')
    
    return redirect(url_for('groups'))

@app.route('/groups/<int:group_id>')
@login_required_dev
def group_details(group_id):
    group = Group.query.get_or_404(group_id)
    # Check if user is member of group
    if current_user not in group.members:
        flash('Access denied. You are not a member of this group.')
        return redirect(url_for('groups'))
    
    expenses = Expense.query.filter_by(group_id=group_id).order_by(Expense.date.desc()).all()
    all_users = User.query.all()
    return render_template('group_details.html', group=group, expenses=expenses, users=all_users)

@app.route('/groups/<int:group_id>/add_member', methods=['POST'])
@login_required_dev
def add_group_member(group_id):
    group = Group.query.get_or_404(group_id)
    if current_user != group.creator:
        flash('Only group creator can add members')
        return redirect(url_for('group_details', group_id=group_id))
    
    member_id = request.form.get('user_id')
    user = User.query.filter_by(id=member_id).first()
    
    if user and user not in group.members:
        group.members.append(user)
        db.session.commit()
        flash(f'{user.name} added to group!')
    
    return redirect(url_for('group_details', group_id=group_id))

@app.route('/groups/<int:group_id>/remove_member/<member_id>', methods=['POST'])
@login_required_dev
def remove_group_member(group_id, member_id):
    group = Group.query.get_or_404(group_id)
    if current_user != group.creator:
        flash('Only group creator can remove members')
        return redirect(url_for('group_details', group_id=group_id))
    
    user = User.query.filter_by(id=member_id).first()
    if user and user in group.members and user != group.creator:
        group.members.remove(user)
        db.session.commit()
        flash(f'{user.name} removed from group!')
    
    return redirect(url_for('group_details', group_id=group_id))

#--------------------
# ROUTES: ADMIN
#--------------------

@app.route('/admin')
@login_required_dev
def admin():
    if not current_user.is_admin:
        flash('Access denied. Admin privileges required.')
        return redirect(url_for('dashboard'))
    
    users = User.query.all()
    return render_template('admin.html', users=users)

@app.route('/admin/add_user', methods=['POST'])
@login_required_dev
def admin_add_user():
    if not current_user.is_admin:
        flash('Access denied. Admin privileges required.')
        return redirect(url_for('dashboard'))
    
    email = request.form.get('email')
    password = request.form.get('password')
    name = request.form.get('name')
    is_admin = request.form.get('is_admin') == 'on'
    
    if User.query.filter_by(id=email).first():
        flash('Email already registered')
        return redirect(url_for('admin'))
    
    user = User(id=email, name=name, is_admin=is_admin)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    
    flash('User added successfully!')
    return redirect(url_for('admin'))

@app.route('/admin/delete_user/<user_id>', methods=['POST'])
@login_required_dev
def admin_delete_user(user_id):
    if not current_user.is_admin:
        flash('Access denied. Admin privileges required.')
        return redirect(url_for('dashboard'))
    
    if user_id == current_user.id:
        flash('Cannot delete your own admin account!')
        return redirect(url_for('admin'))
    
    user = User.query.filter_by(id=user_id).first()
    if user:
        # Delete associated expenses first
        Expense.query.filter_by(user_id=user_id).delete()
        db.session.delete(user)
        db.session.commit()
        flash('User deleted successfully!')
    
    return redirect(url_for('admin'))

@app.route('/admin/reset_password', methods=['POST'])
@login_required_dev
def admin_reset_password():
    if not current_user.is_admin:
        flash('Access denied. Admin privileges required.')
        return redirect(url_for('dashboard'))
    
    user_id = request.form.get('user_id')
    new_password = request.form.get('new_password')
    confirm_password = request.form.get('confirm_password')
    
    # Validate passwords match
    if new_password != confirm_password:
        flash('Passwords do not match!')
        return redirect(url_for('admin'))
    
    user = User.query.filter_by(id=user_id).first()
    if user:
        user.set_password(new_password)
        db.session.commit()
        flash(f'Password reset successful for {user.name}!')
    else:
        flash('User not found.')
        
    return redirect(url_for('admin'))

#--------------------
# ROUTES: SETTLEMENTS
#--------------------

@app.route('/settlements')
@login_required_dev
def settlements():
    # Get all settlements involving the current user
    settlements = Settlement.query.filter(
        or_(
            Settlement.payer_id == current_user.id,
            Settlement.receiver_id == current_user.id
        )
    ).order_by(Settlement.date.desc()).all()
    
    # Get all users
    users = User.query.all()
    
    # Calculate balances between users
    balances = calculate_balances(current_user.id)
    
    # Split balances into "you owe" and "you are owed" categories
    you_owe = []
    you_are_owed = []
    
    for balance in balances:
        if balance['amount'] < 0:
            # Current user owes money
            you_owe.append({
                'id': balance['user_id'],
                'name': balance['name'],
                'email': balance['email'],
                'amount': abs(balance['amount'])
            })
        elif balance['amount'] > 0:
            # Current user is owed money
            you_are_owed.append({
                'id': balance['user_id'],
                'name': balance['name'],
                'email': balance['email'],
                'amount': balance['amount']
            })
    
    return render_template('settlements.html', 
                          settlements=settlements,
                          users=users,
                          you_owe=you_owe,
                          you_are_owed=you_are_owed,
                          current_user_id=current_user.id)

@app.route('/add_settlement', methods=['POST'])
@login_required_dev
def add_settlement():
    try:
        # Parse date with error handling
        try:
            settlement_date = datetime.strptime(request.form['date'], '%Y-%m-%d')
        except ValueError:
            flash('Invalid date format. Please use YYYY-MM-DD format.')
            return redirect(url_for('settlements'))
        
        # Create settlement record
        settlement = Settlement(
            payer_id=request.form['payer_id'],
            receiver_id=request.form['receiver_id'],
            amount=float(request.form['amount']),
            date=settlement_date,
            description=request.form.get('description', 'Settlement')
        )
        
        db.session.add(settlement)
        db.session.commit()
        flash('Settlement recorded successfully!')
        
    except Exception as e:
        flash(f'Error: {str(e)}')
        
    return redirect(url_for('settlements'))
# Add this route to your app.py file

@app.route('/transactions')
@login_required_dev
def transactions():
    """Display all transactions with filtering capabilities"""
    expenses = Expense.query.filter_by(user_id=current_user.id).order_by(Expense.date.desc()).all()
    users = User.query.all()
    
    # Pre-calculate all expense splits to avoid repeated calculations
    expense_splits = {}
    for expense in expenses:
        expense_splits[expense.id] = expense.calculate_splits()
    
    # Calculate monthly totals for statistics
    monthly_totals = {}
    total_expenses = 0
    current_month_total = 0
    current_month_key = datetime.now().strftime('%Y-%m')
    unique_cards = set()
    
    for expense in expenses:
        month_key = expense.date.strftime('%Y-%m')
        if month_key not in monthly_totals:
            monthly_totals[month_key] = {
                'total': 0.0,
                'by_card': {},
                'contributors': {}
            }
            
        # Add to monthly totals
        monthly_totals[month_key]['total'] += expense.amount
        total_expenses += expense.amount
        
        # Add card to total
        if expense.card_used not in monthly_totals[month_key]['by_card']:
            monthly_totals[month_key]['by_card'][expense.card_used] = 0
        monthly_totals[month_key]['by_card'][expense.card_used] += expense.amount
        
        # Track unique cards
        unique_cards.add(expense.card_used)
        
        # Track current month total
        if month_key == current_month_key:
            current_month_total += expense.amount
            
        # Add contributors' data
        splits = expense_splits[expense.id]
        
        # Add payer's portion
        if splits['payer']['amount'] > 0:
            user_id = splits['payer']['email']
            if user_id not in monthly_totals[month_key]['contributors']:
                monthly_totals[month_key]['contributors'][user_id] = 0
            monthly_totals[month_key]['contributors'][user_id] += splits['payer']['amount']
        
        # Add other contributors' portions
        for split in splits['splits']:
            user_id = split['email']
            if user_id not in monthly_totals[month_key]['contributors']:
                monthly_totals[month_key]['contributors'][user_id] = 0
            monthly_totals[month_key]['contributors'][user_id] += split['amount']
    
    return render_template('transactions.html', 
                        expenses=expenses,
                        expense_splits=expense_splits,
                        monthly_totals=monthly_totals,
                        total_expenses=total_expenses,
                        current_month_total=current_month_total,
                        unique_cards=unique_cards,
                        users=users)



#--------------------
# # Password reset routes
#--------------------


@app.route('/reset_password_request', methods=['GET', 'POST'])
def reset_password_request():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        email = request.form['email']
        user = User.query.filter_by(id=email).first()
        
        if user:
            token = user.generate_reset_token()
            db.session.commit()
            
            # Generate the reset password URL
            reset_url = url_for('reset_password', token=token, email=email, _external=True)
            
            # Prepare the email
            subject = "Password Reset Request"
            body_text = f'''
                    To reset your password, please visit the following link:
                    {reset_url}

                    If you did not make this request, please ignore this email.

                    This link will expire in 1 hour.
                    '''
            body_html = f'''
                    <p>To reset your password, please click the link below:</p>
                    <p><a href="{reset_url}">Reset Your Password</a></p>
                    <p>If you did not make this request, please ignore this email.</p>
                    <p>This link will expire in 1 hour.</p>
                    '''
            
            try:
                msg = Message(
                    subject=subject,
                    recipients=[email],
                    body=body_text,
                    html=body_html
                )
                mail.send(msg)
                app.logger.info(f"Password reset email sent to {email}")
                
                # Success message (don't reveal if email exists or not for security)
                flash("If your email address exists in our database, you will receive a password reset link shortly.")
            except Exception as e:
                app.logger.error(f"Error sending password reset email: {str(e)}")
                flash("An error occurred while sending the password reset email. Please try again later.")
        else:
            # Still show success message even if email not found (security)
            flash("If your email address exists in our database, you will receive a password reset link shortly.")
            app.logger.info(f"Password reset requested for non-existent email: {email}")
        
        return redirect(url_for('login'))
    
    return render_template('reset_password.html')

@app.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    email = request.args.get('email')
    if not email:
        flash('Invalid reset link.')
        return redirect(url_for('login'))
    
    user = User.query.filter_by(id=email).first()
    
    # Verify the token is valid
    if not user or not user.verify_reset_token(token):
        flash('Invalid or expired reset link. Please request a new one.')
        return redirect(url_for('reset_password_request'))
    
    if request.method == 'POST':
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        
        if password != confirm_password:
            flash('Passwords do not match.')
            return render_template('reset_password_confirm.html', token=token, email=email)
        
        # Update the user's password
        user.set_password(password)
        user.clear_reset_token()
        db.session.commit()
        
        app.logger.info(f"Password reset successful for user: {email}")
        flash('Your password has been reset successfully. You can now log in with your new password.')
        return redirect(url_for('login'))
    
    return render_template('reset_password_confirm.html', token=token, email=email)





#--------------------
# DATABASE INITIALIZATION
#--------------------

# Database initialization at application startup
with app.app_context():
    try:
        print("Creating database tables...")
        db.create_all()
        print("Tables created successfully")
    except Exception as e:
        print(f"ERROR CREATING TABLES: {str(e)}")

if __name__ == '__main__':
    app.run(debug=True, port=5001)