import request from 'supertest';
import app from "../server/server.ts";
describe('Auth Controller', () => {
    let server;
    beforeAll(() => {
        server = app.listen(4000);
    });
    afterAll(() => {
        server.close();
    });
    it('should register a user', async () => {
        const response = await request(app).post('/api/auth/signin').send({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example2.com',
            password: 'securePassword123',
        });
        expect(response.status).toBe(201);
        expect(response.body.message).toBe('User registered successfully');
    });
    it('should return error if registration fails', async () => {
        const response = await request(app).post('/api/auth/signin').send({
            firstName: '',
            lastName: '',
            email: 'invalid-email',
            password: '',
        });
        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
    });
});
//# sourceMappingURL=authController.test.js.map