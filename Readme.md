# 📡 Offline Wi-Fi Sharing

A real-time **offline sharing application** that allows users connected to the same **Wi-Fi network** to communicate and share data without requiring an internet connection.

The application uses **Socket.IO** for real-time, bidirectional communication between devices on a local network.

---

## 🚀 Features

- 📶 Works on the same Wi-Fi / Local Area Network (LAN)
- 🌐 No internet connection required
- ⚡ Real-time communication using Socket.IO
- 💬 Instant message sharing between connected devices
- 🔄 Automatic connection and disconnection handling
- 👥 Multiple users can connect simultaneously
- 🏠 Suitable for classrooms, colleges, offices, and local networks

---

## 🛠️ Technologies Used

- **Node.js**
- **Express.js**
- **Socket.IO**
- **HTML**
- **CSS**
- **JavaScript**

---

## 📁 Project Structure

```text
offline-wifi-sharing/
│
├── server.js
├── package.json
│
└── public/
    ├── index.html
    ├── style.css
    └── script.js
```
create a uploads folder in global to to store the data and has to be in same wifi
---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone <your-repository-url>
```

### 2. Navigate to the project

```bash
cd offline-wifi-sharing
```

### 3. Install dependencies

```bash
npm install
```

---

## ▶️ Running the Application

Start the server:

```bash
node server.js
```

Or, if using Nodemon:

```bash
npm run dev
```

The server will start on a local port, for example:

```text
http://localhost:3000
```

---

## 📱 Connect Other Devices

Make sure all devices are connected to the **same Wi-Fi network**.

Find the local IP address of the computer running the server:

### Windows

```bash
ipconfig
```

Look for the IPv4 address, for example:

```text
192.168.1.10
```

Other devices on the same network can then open:

```text
http://192.168.1.10:3000
```

They can now communicate with the server in real time.

---

## 🔄 How It Works

```text
        ┌─────────────────┐
        │  Local Wi-Fi    │
        │     Network     │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │   Node.js Server │
        │    + Socket.IO   │
        └────────┬────────┘
                 │
        ┌────────┼────────┐
        │        │        │
        ▼        ▼        ▼
     Device 1  Device 2  Device 3
```

1. A Node.js server is started on one device.
2. The server is connected to the local Wi-Fi network.
3. Other devices connect using the server's local IP address.
4. Socket.IO establishes real-time communication.
5. Messages and data are shared instantly between connected devices.
6. The system continues working without internet access as long as the local network is available.

---

## 💡 Use Cases

- 🏫 College and classroom communication
- 📚 Sharing notes within a local network
- 💻 Office LAN communication
- 🎮 Local multiplayer applications
- 📁 Offline file/data sharing
- 🧑‍🤝‍🧑 Event or hackathon communication systems
- 🌐 Internet-independent local communication

---

## ⚠️ Requirements

- Node.js installed
- Devices connected to the same Wi-Fi network
- Firewall configured to allow the application port
- Server device must remain running

---

## 🔮 Future Improvements

- 📁 File sharing support
- 🔐 User authentication
- 🔒 End-to-end encryption
- 👥 Private rooms
- 📲 QR code-based device connection
- 📊 Connected users dashboard
- 💾 Local message storage
- 📡 Wi-Fi Direct support
- 📱 Mobile application support

---

## 🧑‍💻 Author

Built as a project for exploring **offline communication, local networking, and real-time applications using Socket.IO**.

---

## ⭐ Support

If you found this project useful, consider giving the repository a **star ⭐**.