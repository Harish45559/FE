pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                bat 'npm install'
            }
        }

        stage('Build') {
            steps {
                bat 'npm run build'
            }
        }

        stage('Deploy to Render') {
            steps {
                bat 'curl "%RENDER_FE_DEPLOY_HOOK%"'
            }
        }
    }

    post {
        success {
            echo 'FE pipeline passed — deployed to Render'
        }
        failure {
            echo 'FE pipeline FAILED — Render was NOT deployed'
        }
    }
}
