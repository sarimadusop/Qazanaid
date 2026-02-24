module.exports = {
    apps: [
        {
            name: "kazana-app",
            script: "dist/index.cjs",
            instances: "max",
            exec_mode: "cluster",
            env: {
                NODE_ENV: "production",
                PORT: 5000
            },
            // PM2 will automatically load .env if it exists in the root
            // but we can be explicit if needed
            env_file: ".env"
        }
    ]
};
