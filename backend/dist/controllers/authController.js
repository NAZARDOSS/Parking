import { getConnection } from '../config/db.js';
import * as authService from '../services/authService.js';
export const register = async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    try {
        console.log('Registering user:', { firstName, lastName, email, password });
        await authService.registerUser(firstName, lastName, email, password);
        res.status(201).json({ message: 'User registered successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const token = await authService.loginUser(email, password);
        res.status(200).json({ token });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
export const loginWithGoogle = async (req, res) => {
    const { token } = req.body;
    try {
        const jwtToken = await authService.loginWithGoogle(token);
        res.status(200).json({ token: jwtToken });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
export const getUserInfo = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }
    try {
        const query = 'SELECT firstName, lastName, email FROM users WHERE id = ?';
        const connection = await getConnection();
        const [rows] = await connection.execute(query, [userId]);
        if (Array.isArray(rows) && rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(rows[0]);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
//# sourceMappingURL=authController.js.map