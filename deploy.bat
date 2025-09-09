@echo off
REM MinhMom Application Deployment Script for Windows
REM This script helps deploy the MinhMom application using Docker

setlocal enabledelayedexpansion

REM Colors for output (Windows doesn't support colors in batch, but we can use echo)
set "INFO=[INFO]"
set "WARNING=[WARNING]"
set "ERROR=[ERROR]"

REM Function to print status
:print_status
echo %INFO% %~1
goto :eof

:print_warning
echo %WARNING% %~1
goto :eof

:print_error
echo %ERROR% %~1
goto :eof

REM Check if Docker is installed
:check_docker
docker --version >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker is not installed. Please install Docker Desktop first."
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit /b 1
)
goto :eof

REM Check if .env file exists
:check_env
if not exist .env (
    call :print_warning ".env file not found. Creating from example..."
    copy env.example .env
    call :print_warning "Please edit .env file with your configuration before running again."
    exit /b 1
)
goto :eof

REM Deploy the application
:deploy
call :print_status "Starting MinhMom application deployment..."

call :print_status "Stopping existing containers..."
docker-compose down

call :print_status "Building and starting services..."
docker-compose up --build -d

call :print_status "Waiting for services to be ready..."
timeout /t 10 /nobreak >nul

call :print_status "Checking service health..."

REM Check backend health
curl -f http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    call :print_error "Backend health check failed"
    docker-compose logs backend
    exit /b 1
) else (
    call :print_status "Backend is healthy ✓"
)

REM Check frontend health
curl -f http://localhost/health >nul 2>&1
if errorlevel 1 (
    call :print_error "Frontend health check failed"
    docker-compose logs frontend
    exit /b 1
) else (
    call :print_status "Frontend is healthy ✓"
)

call :print_status "Deployment completed successfully!"
call :print_status "Frontend: http://localhost"
call :print_status "Backend API: http://localhost:8000"
call :print_status "API Documentation: http://localhost:8000/docs"
goto :eof

REM Stop services
:stop
call :print_status "Stopping MinhMom application..."
docker-compose down
call :print_status "Application stopped."
goto :eof

REM Show logs
:logs
docker-compose logs -f
goto :eof

REM Show status
:status
docker-compose ps
goto :eof

REM Main script logic
if "%1"=="deploy" goto deploy
if "%1"=="stop" goto stop
if "%1"=="logs" goto logs
if "%1"=="status" goto status
if "%1"=="restart" goto restart
if "%1"=="" goto deploy

echo Usage: %0 {deploy^|stop^|logs^|status^|restart}
echo.
echo Commands:
echo   deploy   - Build and start the application (default)
echo   stop     - Stop the application
echo   logs     - Show application logs
echo   status   - Show container status
echo   restart  - Restart the application
exit /b 1

:restart
call :stop
timeout /t 2 /nobreak >nul
call :check_docker
if errorlevel 1 exit /b 1
call :check_env
if errorlevel 1 exit /b 1
call :deploy
goto :eof
