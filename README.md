# Expense Tracker Docker Setup with Environment Variables

## Configuration

### Environment Variables
Create a `.env` file in the project root with the following template:

\`\`\`env
# Flask Configuration
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your_super_secret_key_here_change_me

# Database Configuration
DATABASE_PATH=instance/expenses.db
SQLALCHEMY_DATABASE_URI=sqlite:///instance/expenses.db

# Development Mode
DEVELOPMENT_MODE=True

# Development User Credentials (for dev mode)
DEV_USER_EMAIL=dev@example.com
DEV_USER_PASSWORD=dev

# Logging Configuration
LOG_LEVEL=INFO

# Additional Configuration Options
DEBUG=False
\`\`\`

### Important Environment Variables
- \`SECRET_KEY\`: Change this to a unique, random string in production
- \`DEVELOPMENT_MODE\`: Set to \`True\` for development, \`False\` for production
- \`DEV_USER_EMAIL\` and \`DEV_USER_PASSWORD\`: Credentials for development mode
- \`LOG_LEVEL\`: Set logging verbosity (DEBUG, INFO, WARNING, ERROR, CRITICAL)

## Prerequisites
- Docker
- Docker Compose

## Quick Start

### 1. Clone the Repository
\`\`\`bash
git clone <your-repo-url>
cd expense-tracker
\`\`\`

### 2. Create .env File
Copy the example environment configuration above and customize as needed.

### 3. Build and Run
\`\`\`bash
docker-compose up --build
\`\`\`

### 4. Access the Application
Open your browser and navigate to:
- http://localhost:5001

## Security Recommendations
- Never commit your \`.env\` file to version control
- Use different \`.env\` files for development and production
- Generate a strong, unique \`SECRET_KEY\`
- Use environment-specific configurations

## Switching Between Environments
- For development: Use \`DEVELOPMENT_MODE=True\`
- For production: Use \`DEVELOPMENT_MODE=False\`

## Troubleshooting
- Ensure \`.env\` file is properly formatted
- Check Docker logs for configuration errors
- Verify all required environment variables are set
