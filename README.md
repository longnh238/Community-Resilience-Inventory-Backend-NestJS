# Community Resilience Inventory

The **Community Resilience Inventory** is an efficient platform designed for managing community-based resilience data, providing diverse user roles with the ability to interact with, customize, and maintain their community data. The tool offers both administrators and community users a wide array of features to help manage and assess community resilience through predefined templates, custom elements, and data-sharing capabilities.

## Features

### Admin Features:
- **Admin Dashboard**: Provides an overview of all community data and activities.
- **User Management**: Admins can create, read, update, and delete (CRUD) users within the system.
- **Community Management**: Allows CRUD operations for managing communities.
- **Proxy Management**: Enables CRUD operations for RESILOC proxies, which are the core components representing community data.
- **Indicator Management**: Manage resilience indicators via CRUD functionality.
- **Scenario Management**: Create, update, and manage community-based resilience scenarios.
- **Open Data Management**: Facilitate open data creation and sharing with the community.

### Community Features:
- **User Registration & Authentication**: New users can register, authenticate, and access community resources.
- **Community Subscription**: Users can follow and stay updated with various communities.
- **Community Profile Configuration**: Community administrators can manage their community’s profile and settings.
- **User Role Management**: Update and modify the roles and permissions of community members.
- **Proxy Management**: Import, create, read, update, and delete (ICRUD) community proxies to track resilience data.
- **Indicator Management**: ICRUD operations for community-specific resilience indicators.
- **Scenario Management**: ICRUD for creating and managing custom community scenarios.
- **Data Entry & Snapshot Management**: CRUD operations for snapshots that record and track data over time.
- **Assessment Timeline**: Provides a visual overview of community resilience assessments.

### Inherited Templates:
The **Community Resilience Inventory** includes formal templates for proxies, indicators, and scenarios that have been researched, defined, and verified. Communities can inherit these templates and modify them to suit their specific needs or create their own if required.

## Backend Overview

The **Community Resilience Inventory** backend is powered by **NestJS**, PostgreSQL, MongoDB, and Redis to ensure scalability, flexibility, and efficiency.

### Key Technologies:
- **NestJS**: A progressive, open-source Node.js framework offering built-in modules like TypeORM, Passport, and caching mechanisms to streamline backend development.
  
- **PostgreSQL**: Serves as the primary database for managing structured and relational data, including templates, proxies, indicators, scenarios, snapshots, and timelines. It guarantees ACID compliance and supports both SQL and JSON-based data operations.

- **MongoDB**: Handles less relational and more dynamic data such as community profiles, users, and system notifications. MongoDB also serves as a backup for storing unstructured data, including social media or sensor data, and is powered by Mongoose as an ODM (Object Data Modelling) library.

- **Redis**: Used as an in-memory cache to store frequently accessed data, such as authentication tokens, for quicker response times.

## Installation

To run the **Community Resilience Inventory** locally, it is required to have:

### Prerequisites
- Node.js
- PostgreSQL
- MongoDB
- Redis

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
