# 💵 DollarDollar Bill Y'all

A sleek, easy-to-use expense tracker and bill-splitting app built with Flask.

## What is this?

DollarDollar helps you track expenses, split bills with friends or roommates, and manage shared costs through customizable groups. Perfect for:

- Roommates sharing household expenses
- Friends splitting vacation costs
- Couples managing shared finances
- Groups organizing events with shared costs

## Features

- **Expense Tracking**: Log expenses with detailed information
- **Flexible Splitting**: Split costs equally, by percentage, or custom amounts
- **Group Management**: Create groups for organizing shared expenses
- **Monthly Summaries**: View spending breakdowns by month
- **Multiple Payment Methods**: Track which cards were used for purchases
- **User Management**: Admin controls for managing users

## Quick Start with Docker

### Prerequisites
- Docker
- Docker Compose

### Setup & Run

1. **Clone the repository**
   ```
   git clone https://github.com/yourusername/dollardollar.git
   cd dollardollar
   ```

2. **Create an environment file**
   
   Create a `.env` file with the following:
   ```
   # App configuration
   SECRET_KEY=your_secret_key_change_me
   DEVELOPMENT_MODE=True
   
   # Development user (for quick testing)
   DEV_USER_EMAIL=dev@example.com
   DEV_USER_PASSWORD=dev
   ```

3. **Build and run with Docker**
   ```
   docker-compose up --build
   ```

4. **Access the app**
   
   Open your browser and go to:
   - http://localhost:5001

## Development Mode

In development mode:
- The app automatically creates a development user
- You'll be logged in automatically as the dev user
- The database is reset on each restart

To disable development mode, set `DEVELOPMENT_MODE=False` in your `.env` file.

## Production Setup

For production use:
1. Set `DEVELOPMENT_MODE=False` in `.env`
2. Generate a strong random secret key
3. The First signed User will become an Admin

## Screenshots

(Coming soon)
1. Email to added user feature
2. Settle up 
3. Generate reports and export transactions 

## License

MIT License