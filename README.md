# Project Overview

##### This Node.js application is built using a microservices architecture, designed for scalability, modularity, and maintainability. It uses TypeScript for strong typing and integrates key technologies such as ExpressJS, PostgreSQL, Redis, Apache Kafka, REST APIs, and Docker to ensure optimal performance and flexibility in scaling individual services. The application applies multiple design patterns and software engineering principles to promote clean, maintainable, and testable code.

---

# 📖 Table of Contents

1. Features
2. Architecture Overview
3. Interaction Flow in Microservices and Architecture
4. Domain-Driven Design Principles and Patterns
5. Design Patterns
6. Principles
7. Technologies
8. Getting Started
9. Project Structure
10. API Documentation
11. Running the Application
12. Running Tests
13. Usage
14. Contributing
15. License

---

# ✨ Features

## Order Management

* Order Retrieval
* Fetches a paginated list of orders with filtering options.
* Uses Redis caching to optimize data retrieval.
* Creates a new order with PENDING status.
* Associates the order with the current authenticated user.
* Publishes an event to notify admins about the new order.
* Future enhancement: Email notification to admins for approval.
* Updates order status from PENDING to COMPLETED.
* Generates an invoice and marks it as PAID.
* Publishes an event upon approval.
* Future enhancement: Email notification with an attached invoice.
* Updates order status from PENDING to CANCELLED.
* Generates an invoice and marks it as CANCELLED.
* Publishes an event upon cancellation.
* Future enhancement: Email notification with an attached invoice.

---

## User Service
* Fetches a paginated list of users with filtering options.
* Retrieves users along with their assigned roles.
* Uses Redis caching for performance optimization.
* Fetches a user by ID.
* Ensures the user exists before returning the data.
* Validates that an email is unique before creating a user.
* Assigns a default role if none is specified.
* Generates a strong password.
* Publishes an event upon user creation.
* Future enhancement: Send an email with login credentials.
* Updates user details, ensuring no duplicate email exists.
* Publishes an event upon user update.
* Verifies current password before allowing an update.
* Ensures password confirmation matches.
* Encrypts the new password before saving.
* Publishes an event upon password update.

---

## Future Enhancements

* Implement email notifications for order approvals, cancellations, and user account creation.
* Enhance Redis caching to improve query performance further.
* Introduce logging and monitoring to track system performance and user interactions.

---

# 🏗 Architecture Overview

![Architecture Overview](./image/logical-diagram.png)

---

#### This application follows a microservices architecture where each core business function (Order Management, User Management, etc.) is handled by an independent service. This ensures better scalability, fault isolation, and maintainability.

* Microservices: Each business domain (Orders, Users, Invoices) is isolated into its own service, allowing independent scaling and development.
* Modular Design: Each service follows clear boundaries and can be developed/deployed independently.
* Event-Driven Communication: Services interact asynchronously via Kafka events (e.g., order creation, user updates).
* Asynchronous Processing: Redis is used for caching and message queues, ensuring non-blocking operations.
* Load Balancing: The system scales horizontally using Docker, Kubernetes, and Nginx.

---

# 🧩🔄⚙️🌐 Interaction Flow in Microservices


![Interaction Flow in DDD and Microservices](./image/interaction-diagram.png)

---

## 1. Domain Layer:

* Houses the core business logic for each microservice (Orders, Users, Invoices).
* Encapsulates operations like changing order statuses, creating users, and generating invoices.

## 2. Service Layer:

* Handles interactions between the domain logic and infrastructure.
* Uses repositories for data persistence and Kafka for event-driven communication.

## 3. Infrastructure Layer:

* Manages PostgreSQL, Redis, Kafka, and email notifications.
* Redis is leveraged for caching frequently accessed data.

## 4. API Gateway:

* Routes client requests to the appropriate microservice.
* Can aggregate responses from multiple services, reducing client complexity.

## 5. Event-Driven Communication:

* Kafka publishes and consumes events for system-wide updates.
* Example: When an order is approved, a Kafka event triggers the invoice generation process.

---

# ⚙️ Domain-Driven Design Principles and Patterns

* REST API with ExpressJS & TypeScript
* PostgreSQL with ORM for database management
* Redis for caching and queue management
* Dependency Injection using typedi
* Event-driven architecture with Kafka for inter-service communication
* Microservices architecture for scalability
* Robust Logging & Monitoring
* Unit & E2E Testing for reliability
* Security Best Practices
* Scalable & Maintainable Codebase

---

# 🧩⚙️🛠️📐 Design Patterns

##### The following design patterns have been applied to the system to ensure modularity, flexibility, and scalability:

## 1. Singleton Pattern

* Used for managing database connections and Redis cache to ensure only one instance is created.

## 2. Factory Pattern

* Encapsulates object creation, allowing for dynamic service instantiation.

## 3. Dependency Injection (DI)

* Uses TypeDI to inject dependencies, reducing coupling.

## 4. Observer Pattern

* Ensures real-time updates by notifying services of state changes (e.g., via Kafka events).

## 5. Strategy Pattern

* Allows dynamic switching between querying strategies without modifying core logic.

## 6. Command Pattern

* Encapsulates complex workflows like submitting jobs to Redis queues.

## 7. Decorator Pattern

* Adds features like caching and event publishing without modifying core functionality.

## 8. Proxy Pattern

* Implements caching and rate-limiting to optimize API calls.

## 9. Repository Pattern

* Abstracts database interactions, ensuring a clean separation from business logic.

## 10. Builder Pattern

* Constructs complex objects like invoices and user profiles in a systematic way.

## 11. Publisher-Subscriber Pattern

* Uses Kafka for event-driven messaging, allowing services to communicate asynchronously.

---

# 📏🧭💡⚖️ Principles

##### This project follows key software design principles to ensure a robust and maintainable codebase:

## 1. SOLID Principles

* Single Responsibility Principle (SRP): Each class and module has a single responsibility, minimizing changes and complexity.
* Open/Closed Principle (OCP): Classes and modules are open for extension but closed for modification, enabling easier feature additions without breaking existing functionality.
* Liskov Substitution Principle (LSP): Derived classes can be used in place of their base classes without altering the correctness of the program.
* Interface Segregation Principle (ISP): Clients should not be forced to depend on interfaces they do not use. This helps in creating smaller, specialized interfaces.
* Dependency Inversion Principle (DIP): High-level modules should not depend on low-level modules. Both should depend on abstractions, which is achieved through DI.

## 2. DRY (Don't Repeat Yourself)

* The codebase ensures that redundant logic and code are minimized. Reusable components and functions are created for common tasks such as error handling, logging, and validation.

## 3. KISS (Keep It Simple, Stupid)

* The application follows a simple and clear architecture, avoiding unnecessary complexity in both the design and implementation. We favor simplicity and readability.

## 4. YAGNI (You Aren't Gonna Need It)

* Only essential features and functionality are implemented. The project avoids overengineering, focusing on the current requirements.

## 5. Separation of Concerns

* The project ensures that business logic, data access, and presentation are separated. Each module is responsible for a specific concern, promoting modularity and maintainability.

## 6. Composition Over Inheritance

* The project favors composing objects and reusing behavior through composition rather than relying heavily on inheritance.

---

# 💻 Technologies

* Node.js & ExpressJS – Backend framework.
* TypeScript – Statically typed JavaScript.
* PostgreSQL – Relational database with ORM.
* Redis – Caching and message queues.
* Kafka – Event-driven microservices communication.
* TypeDI – Dependency Injection.
* Docker & Kubernetes – Containerization & orchestration.
* DataLoader – Optimized database queries.

---

# 🚀 Getting Started

## 1. Prerequisites

### For Docker Usage

* Install Docker Desktop and ensure it is running.

### For Application Usage

* ✅ Node.js (v23.x or higher)
* ✅ TypeScript
* ✅ PostgreSQL
* ✅ Redis
* ✅ Kafka
* ✅ Docker & Kubernetes
* ✅ yarn

---

## Installation

## 1. Clone the repository:

```javascript
git clone git@github.com:yavarguliyev/invoice_hub_microservices.git
```

## 2. Set Up Environment: 

#### The Docker setup is located at {main_root}/deployment/dev. For managing containers, we do not use the docker-compose up -d command directly. Instead, we use specific scripts to handle the container lifecycle.

#### 1. To start the containers:

```javascript
bash start.sh
```

#### 2. To stop the containers:

```javascript
bash stop.sh
```

#### 3. To remove the containers, images, and volumes:

```javascript
bash remove.sh 
```

## Environment Configuration

* The .env file located in {main_root}/deployment/dev/.env is required for configuration.
* You can copy the example file (.env.example) to create your own .env file.

## 3. Install dependencies:

```javascript
yarn add
```

## 4. Run Migrations:

##### Run migrations:

```javascript
yarn mup
```

##### Revert migrations:

```javascript
yarn mdn
```

##### Copy the .env.example file to .env and fill in the appropriate values for your environment.

---

# 📂 Project Structure

```javascript
/api-gateway    # Manages API routing.
/common         # Shared utilities and configs.
/deployment     # Deployment environment configs.
├── /dev        # Development environment setup.
├── /prod       # Production environment setup.
/services       # Individual service modules
├── /auth       # Handles authentication logic.
├── /invoices   # Manages invoice operations.
├── /orders     # Handles order operations.
/package.json   # Defines workspaces for modular structure.
└── README.md   # Project documentation.
```

---

# 📚📄📝💻 API Documentation

#### API documentation is available at:

#### A Postman collection file is also included for testing API use cases:

```javascript
/postman/invoice_hub_microservices.postman_collection.json
```

# 🚀▶️💻 Running the Application

##### To start the application:

```javascript
yarn start
```

# 🧪✅🔍 Running Tests

##### To run tests, execute the following command:

```javascript
yarn test
```

---

# 🛠 Usage

## Example Operations

### 1. Create an Order

#### Endpoint: POST {{URL}}/orders/api/v1/orders

```javascript
{
    "totalAmount": 180.20
}
```

### 2. Approve the Order

```javascript
Endpoint: PATCH {{URL}}/orders/api/v1/orders/{{id}}/approve
```

### 3. Cancel the Order

```javascript
Endpoint: PATCH {{URL}}/orders/api/v1/orders/{{id}}/cancel
```

---

# 🤝 Contributing

1. Fork the repository.
2. Create a new branch (git checkout -b feature-name).
3. Commit your changes (git commit -am 'Add new feature').
4. Push to the branch (git push origin feature-name).
5. Create a new Pull Request.

---

# 📝 License

#### This project is licensed under the MIT License. See the [LICENSE](https://github.com/yavarguliyev/invoice_hub_microservices/blob/master/LICENSE) file for details.
