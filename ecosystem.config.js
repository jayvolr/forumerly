module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [

    // First application
    {
      name      : 'forumerly',
      script    : 'app.js',
      env_production : {
        NODE_ENV: 'production'
      }
    },

  ],

  /**
   * Deployment section
   * http://pm2.keymetrics.io/docs/usage/deployment/
   */
  deploy : {
    production : {
      key  : '~/.ssh/id_rsa',
      user : 'root',
      host : '162.243.197.96',
      ref  : 'origin/master',
      repo : 'https://github.com/jayvolr/forumerly.git',
      path : '~/forumerly',
      'post-deploy' : 'nvm install && npm install && /root/.nvm/versions/node/v7.9.0/bin/pm2 reload ecosystem.config.js --env production && pm2 startOrRestart ecosystem.config.js'
    },
  }
};
