import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { isUserLoggedIn } from "./middlewares/auth.js";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";

dotenv.config();

// alternative config of dotenv
// import "dotenv/config"

const port = process.env.PORT || 3001;

const app = express();
const prisma = new PrismaClient();

prisma.$connect().then(() => console.log("Database connected"));

app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  return res.status(200).json({ message: "Welcome to our backend server" });
});

app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // making sure always the usename is in lowercase
    const newUsername = username.toLowerCase();

    const checkUsernameExist = await prisma.user.findUnique({
      where: { username: newUsername },
    });

    if (checkUsernameExist) {
      return res.status(409).json({ message: "username already exist" });
    }

    const checkEmailExist = await prisma.user.findUnique({
      where: { email },
    });

    if (checkEmailExist) {
      return res.status(409).json({ message: "Email already exist" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: newUsername,
        email: email,
        password: hashedPassword,
      },
    });

    return res.status(201).json({
      message: "Registration is successful",
      userData: user,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Server failure. Please try again after some time" });
  }
});

//Reetrieve all users
app.get("/users", isUserLoggedIn, async (req, res) => {
  try {
    // console.log(req.user);

    const users = await prisma.user.findMany();
    return res.status(200).json(users);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Server failure. Please try again after some time" });
  }
});

// COUNT STORED USERS
app.get("/count/users", async (req, res) => {
  try {
    const countUsers = await prisma.user.count();
    return res.status(200).json({
      message: `Number of stored users: ${countUsers}`,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Server failure. Please try again after some time" });
  }
});

//change username/ update using params
app.patch("/users/:userId", async (request, response) => {
  try {
    const user_id = request.params.userId;
    const username = request.body.username;

    const checkUsernameExist = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (checkUsernameExist) {
      return response.status(409).json({ message: "username already exist" });
    }

    const checkUserWithUserId = await prisma.user.findUnique({
      where: {
        id: parseInt(user_id),
      },
    });

    if (!checkUserWithUserId) {
      return response.status(404).json({ message: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(user_id) },
      data: {
        username: username.toLowerCase(),
      },
    });

    return response.status(200).json(updatedUser);
  } catch (error) {
    console.log(error);
    return response
      .status(500)
      .json({ message: "Server failure. Please try again after some time" });
  }
});

app.delete("/users/:userId", async (req, res) => {
  try {
    const user_id = req.params.userId;
    const checkRecordExist = await prisma.user.findUnique({
      where: { id: parseInt(user_id) },
    });

    if (!checkRecordExist) {
      return res.status(404).json({ message: "Record not found" });
    }
    await prisma.user.delete({
      where: { id: checkRecordExist.id },
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Server failure. Please try again after some time" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // find the user in database with the provided email
    const user = await prisma.user.findUnique({
      where: { email },
    });
    // if not foud
    if (!user) {
      return res.status(401).json({ message: "Invalid crentials" });
    }

    // compare password
    const isPwdCorrect = await bcrypt.compare(password, user.password);

    // if password is incorrect, return unauthorized res
    if (!isPwdCorrect) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(200).json({
      message: "Login is successful",
      userData: user,
      token,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Server failure. Please try again after some time" });
  }
});

app.listen(port, () => console.log(`Server is running on port ${port}`));
