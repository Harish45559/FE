pipeline {
    agent any

    environment {
        NODE_VERSION = '20'
        APP_DIR      = '/var/www/attendance_fe'
        PM2_APP_NAME = 'attendance-fe'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    rm -rf ${APP_DIR}/dist
                    cp -r dist ${APP_DIR}/dist
                    pm2 restart ${PM2_APP_NAME} || pm2 serve ${APP_DIR}/dist 3000 --name ${PM2_APP_NAME} --spa
                '''
            }
        }
    }

    post {
        success {
            echo "FE pipeline passed — deployed to ${APP_DIR}"
        }
        failure {
            echo "FE pipeline FAILED — check logs above"
        }
    }
}
