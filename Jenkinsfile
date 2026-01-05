pipeline {
    agent any

    environment {
        // HIER ANPASSEN
        GITHUB_USER = 'yildizog'
        GITHUB_REPO = 'AutoBerichtsheft'
        IMAGE_NAME  = "mein-app-image"
        CONTAINER_NAME = "meine-laufende-app"
        PORT_EXT    = "8080"  // Der Port, unter dem die App erreichbar sein soll
        PORT_INT    = "3000"  // Der Port, den deine App im Container nutzt
    }

    stages {
        stage('Checkout') {
            steps {
                git url: "https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git", branch: 'main'
            }
        }

        stage('Build') {
            steps {
                echo "Baue Docker Image..."
                sh "docker build -t ${IMAGE_NAME}:latest ."
            }
        }

        stage('Test') {
            steps {
                echo "Führe einfache Tests aus..."
                // Beispiel: Prüfen, ob der Container überhaupt startet
                sh "docker run --rm ${IMAGE_NAME}:latest echo 'Container-Start-Test erfolgreich'"
            }
        }

        stage('Deploy') {
            steps {
                echo "Bereite Deployment vor..."
                // 1. Alten Container stoppen und entfernen (falls er existiert)
                // Das '|| true' verhindert, dass die Pipeline abbricht, wenn kein Container läuft
                sh "docker stop ${CONTAINER_NAME} || true"
                sh "docker rm ${CONTAINER_NAME} || true"

                // 2. Neuen Container starten
                echo "Starte neuen Container auf Port ${PORT_EXT}..."
                sh "docker run -d --name ${CONTAINER_NAME} -p ${PORT_EXT}:${PORT_INT} ${IMAGE_NAME}:latest"
            }
        }
    }

    post {
        success {
            echo "CI/CD Pipeline erfolgreich abgeschlossen!"
        }
        failure {
            echo "Fehler in der Pipeline. Bitte Logs prüfen."
        }
    }
}