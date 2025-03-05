# 💵 DollarDollar Bill Y'all

An open-source, self-hosted expense tracking and bill-splitting application designed for privacy, flexibility, and financial transparency.


## NOTE:
If you are encountring issues after updating/pulling the recent docker. Please run
- flask db migrate 
- flask db upgrade


## 🌟 Why DollarDollar?

Born from a desire to move beyond restrictive financial tracking platforms, this app empowers users with:
- 🔐 Complete control over personal financial data
- 💡 Flexible expense splitting mechanisms
- 🏠 Self-hosted privacy
- 🤝 Collaborative expense management

##  Key Features

### Expense Tracking
- 📊 Detailed transaction logging
- 💳 Multi-card support
- 📅 Date-based expense tracking

### Splitting Capabilities
- 💸 Multiple split methods
  - Equal split
  - Custom amount split
  - Percentage-based split
- 👥 Group and personal expense tracking

### Financial Insights
- 📆 Monthly financial summaries
- 💰 Comprehensive balance tracking
- 🔍 Detailed transaction filters

### Privacy & Control
- 🔒 Self-hosted solution
- 🛡️ No third-party data sharing
- 🔐 Secure user authentication

## 🛠 Tech Stack

- **Backend**: Python, Flask
- **Database**: PostgreSQL
- **Authentication**: Flask-Login
- **Frontend**: Bootstrap, HTML5
- **Deployment**: Docker

## 🚦 Getting Started

### Prerequisites
- Docker
- Docker Compose
- Git

### Quick Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/dollardollar.git
   cd dollardollar
   ```

2. Configure environment
   ```bash
   cp .env.template .env
   # Edit .env with your configuration
   ```

3. Launch the application
   ```bash
   docker-compose up -d
   ```

4. Access the app at `http://localhost:5006`

## 🤝 Development Approach

This project explores AI-assisted open-source development:
- Leveraging AI tools for rapid prototyping
- Combining technological innovation with human creativity
- Iterative development with large language models
  - Local LLMs(qwen2.5, DeepSeek-V3)
  - Claude AI
  - Human domain expertise


## Contributing

Contributions are welcome! Please check out our contributing guidelines.

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

##  License

MIT License

##  Acknowledgements

- Inspired by the need for transparent, flexible expense tracking
- Special thanks to my wife, who endured countless late nights of coding, provided unwavering support, and maintained patience during endless debugging sessions. This project wouldn't exist without her understanding and encouragement.
