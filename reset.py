#!/usr/bin/env python
"""
This script completely resets the database by deleting the existing database file
and creating a new empty one with the current schema.
"""

import os
import sys
from app import app, db

def reset_database():
    """Delete existing database and create a new empty one with the current schema"""
    try:
        print("Starting database reset...")
        
        # Enter application context
        with app.app_context():
            # Get the database file path
            db_path = app.config['SQLALCHEMY_DATABASE_URI']
            if db_path.startswith('sqlite:///'):
                db_path = db_path.replace('sqlite:///', '')
                
                # If it's a relative path, make it absolute
                if not os.path.isabs(db_path):
                    db_path = os.path.join(app.root_path, db_path)
                
                print(f"Database file path: {db_path}")
                
                # Delete the existing database file if it exists
                if os.path.exists(db_path):
                    os.remove(db_path)
                    print("Deleted existing database file.")
                else:
                    print("No existing database file found.")
            
            # Make sure the directory exists
            db_dir = os.path.dirname(db_path)
            if not os.path.exists(db_dir):
                os.makedirs(db_dir)
                print(f"Created directory: {db_dir}")
                
            # Create all tables with the current schema
            db.create_all()
            print("Created new database with current schema.")
        
        print("\nDatabase has been successfully reset!")
        print("The database is now empty. The first user to sign up will automatically become an admin.")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    print("DollarDollar Database Reset Utility")
    print("---------------------------------")
    print("WARNING: This will delete all data in your database!")
    confirm = input("Are you sure you want to proceed? (y/n): ").lower()
    
    if confirm == 'y':
        reset_database()
    else:
        print("Database reset cancelled. No changes were made.")