# Installation and Usage Guide for DollarDollar Bill Y'all

## Prerequisites

### System Requirements
- Docker (version 20.10 or later)
- Docker Compose (version 1.29 or later)
- Minimum 2GB RAM
- Web browser (Chrome, Firefox, Safari, or Edge)

### Recommended Hardware
- 4GB RAM
- 10GB disk space
- Internet connection for initial setup

### NOTE : The first user to signup will become the admin 

## Installation Methods

### 1. Docker Deployment (Recommended)

#### Quick Start
```bash
# Clone the repository
git clone https://github.com/yourusername/dollardollar.git
cd dollardollar

# Copy environment template
cp .env.template .env

# Edit .env file with your configurations
nano .env

# Build and run the application
docker-compose up --build
```

#### Detailed Configuration

1. **Environment Variables**
   - `SECRET_KEY`: Generate a random, secure string
   - `DEVELOPMENT_MODE`: Set to `False` for production
   - `DISABLE_SIGNUPS`: Control user registration
   - Configure email settings if needed

2. **Access the Application**
   - Open http://localhost:5001 in your web browser
   - First registered user becomes the admin

### 2. Local Development Setup

#### Requirements
- Python 3.9+
- PostgreSQL 13+
- pip
- virtualenv (recommended)

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
flask db upgrade

# Run the application
flask run
```

## Basic Use Cases

### 1. Adding an Expense

1. Click "Add New Expense"
2. Fill in details:
   - Description
   - Amount
   - Date
   - Card Used
   - Split Method (Equal/Custom/Percentage)
3. Select participants
4. Save expense

### 2. Creating a Group

1. Navigate to "Groups"
2. Click "Create Group"
3. Add group name and description
4. Invite group members
5. Start sharing expenses within the group

### 3. Settling Up

1. Go to "Settle Up" page
2. View who owes what
3. Record settlements
4. Track balance between users

## Security Considerations

- Use strong, unique passwords
- Enable two-factor authentication if possible
- Regularly update the application
- Keep your Docker and dependencies updated

## Troubleshooting

### Common Issues
- Ensure Docker is running
- Check container logs
- Verify environment variables
- Restart containers

```bash
# View container logs
docker-compose logs web

# Restart services
docker-compose down
docker-compose up --build
```

## Backup and Restore

### Database Backup
```bash
# Backup PostgreSQL database
docker-compose exec db pg_dump -U postgres dollardollar > backup.sql

# Restore database
docker-compose exec -T db psql -U postgres dollardollar < backup.sql
```

## Upgrade Process

1. Pull latest version
2. Update dependencies
3. Run database migrations
4. Rebuild and restart containers

```bash
git pull origin main
docker-compose down
docker-compose up --build
```

## Contributing

- Report issues on GitHub
- Submit pull requests
- Follow project coding standards

## License

MIT License - See LICENSE file for details