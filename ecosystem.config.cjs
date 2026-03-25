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
            }
        }
    ]
};


