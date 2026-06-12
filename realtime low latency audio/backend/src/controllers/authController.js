import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforyourrealtimeaudiocallmvp';

export async function register(req, res) {
  try {
    const { name, email, password, defaultSpeakingLanguage, defaultListeningLanguage } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      defaultSpeakingLanguage: defaultSpeakingLanguage || 'en',
      defaultListeningLanguage: defaultListeningLanguage || 'en'
    });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        defaultSpeakingLanguage: user.defaultSpeakingLanguage,
        defaultListeningLanguage: user.defaultListeningLanguage
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.status(200).json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        defaultSpeakingLanguage: user.defaultSpeakingLanguage,
        defaultListeningLanguage: user.defaultListeningLanguage
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
}

export async function getMe(req, res) {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'defaultSpeakingLanguage', 'defaultListeningLanguage']
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error fetching user profile' });
  }
}

export async function updatePreferences(req, res) {
  try {
    const { defaultSpeakingLanguage, defaultListeningLanguage } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (defaultSpeakingLanguage) user.defaultSpeakingLanguage = defaultSpeakingLanguage;
    if (defaultListeningLanguage) user.defaultListeningLanguage = defaultListeningLanguage;

    await user.save();

    res.status(200).json({
      message: 'Preferences updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        defaultSpeakingLanguage: user.defaultSpeakingLanguage,
        defaultListeningLanguage: user.defaultListeningLanguage
      }
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Server error updating preferences' });
  }
}
