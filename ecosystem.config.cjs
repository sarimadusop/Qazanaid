const path = require('path');

module.exports = {
    apps: [
        {
            name: "kazana-app",
            script: "node",
            args: "--env-file=.env dist/index.cjs",
            instances: "max",
            exec_mode: "cluster",
            env: {
                NODE_ENV: "production",
                PORT: 5000
            }
        }
    ]
};

