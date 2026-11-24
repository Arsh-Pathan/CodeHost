process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/codehost_test';
process.env.JWT_SECRET ??= 'test_jwt_secret_key_for_unit_tests';
process.env.JWT_REFRESH_SECRET ??= 'test_jwt_refresh_secret_key_for_unit_tests';
