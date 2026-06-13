const request = require('supertest');
const { app } = require('../../src/app');

const api = request(app);

module.exports = { api };
