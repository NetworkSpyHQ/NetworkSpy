# Contributing to Network Spy

Thank you for your interest in contributing to Network Spy! We welcome contributions from everyone.

Here are some guidelines to help you get started.

## How to Contribute

### 1. Report Bugs
If you find a bug, please open an issue on GitHub. Include:
* A clear description of the bug.
* Steps to reproduce the behavior.
* Expected vs actual behavior.
* Screenshots if applicable.
* Your OS and app version.

### 2. Suggest Features
We are always looking for ways to improve Network Spy. If you have an idea:
* Open an issue and describe the feature.
* Explain why it would be useful.
* If possible, describe how it might be implemented.

### 3. Submit Pull Requests
If you want to contribute code:
1. Fork the repository.
2. Create a new branch for your feature or bugfix (`git checkout -b feature/amazing-feature`).
3. Make your changes.
4. Ensure your code follows the project's style and passes tests.
5. Commit your changes (`git commit -m 'Add some amazing feature'`).
6. Push to the branch (`git push origin feature/amazing-feature`).
7. Open a Pull Request.

## Development Setup

To set up your environment for development:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/NetworkSpyHQ/NetworkSpy.git
   cd NetworkSpy
   ```

2. **Install dependencies**:
   This project uses Bun.
   ```bash
   bun install
   ```

3. **Install Rust**:
   Ensure you have Rust installed. If not, get it from [rustup.rs](https://rustup.rs/).

4. **Run the app in dev mode**:
   ```bash
   bun run dev
   ```

## Code Style

* **Frontend**: We use TypeScript, React, and Tailwind CSS.
* **Backend**: We use Rust.
* Follow the existing code style and formatting.
* Write clean, readable code with comments where necessary.

## License

By contributing to Network Spy, you agree that your contributions will be licensed under the project's Apache-2.0 License.
