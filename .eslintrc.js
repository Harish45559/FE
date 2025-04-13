module.exports = {
    env: {
      browser: true,
      es2021: true,
      node: true // 👈 This is the key part
    },
    extends: [
      'eslint:recommended',
      'plugin:react/recommended'
    ],
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    plugins: ['react'],
    rules: {
      // your custom rules
    }
  };
  