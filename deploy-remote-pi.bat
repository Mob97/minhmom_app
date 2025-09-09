@echo off
REM Remote Raspberry Pi Deployment Script for Windows
REM This script deploys the application to a remote Raspberry Pi via SSH

setlocal enabledelayedexpansion

REM Colors for output (Windows doesn't support colors in batch, but we can use echo)
set "INFO=[INFO]"
set "WARNING=[WARNING]"
set "ERROR=[ERROR]"
set "PI=[RASPBERRY PI]"

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

:print_pi
echo %PI% %~1
goto :eof

REM Check if .env file exists
if not exist .env (
    call :print_error ".env file not found. Please create one with the following variables:"
    echo PI_HOST=192.168.1.100
    echo PI_USER=pi
    echo PI_PASSWORD=your_password
    echo PI_PORT=22
    echo MONGODB_URI=mongodb://localhost:27017
    echo VITE_GROUP_ID=2847737995453663
    exit /b 1
)

REM Load environment variables from .env file
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    if not "%%a"=="" if not "%%a:~0,1%"=="#" (
        set "%%a=%%b"
    )
)

REM Set defaults
if not defined PI_HOST set PI_HOST=192.168.1.100
if not defined PI_USER set PI_USER=pi
if not defined PI_PASSWORD set PI_PASSWORD=
if not defined PI_PORT set PI_PORT=22
if not defined PI_APP_DIR set PI_APP_DIR=~/minhmom-app

if "%PI_PASSWORD%"=="" (
    call :print_error "PI_PASSWORD not set in .env file"
    exit /b 1
)

call :print_status "Loaded configuration:"
call :print_status "  Host: %PI_HOST%"
call :print_status "  User: %PI_USER%"
call :print_status "  Port: %PI_PORT%"
call :print_status "  App Directory: %PI_APP_DIR%"

REM Check if required tools are installed
call :print_status "Checking required tools..."

where sshpass >nul 2>&1
if errorlevel 1 (
    call :print_error "sshpass is not installed. Please install it first:"
    echo 1. Download from: https://sourceforge.net/projects/sshpass/
    echo 2. Extract to a folder in your PATH
    echo 3. Or install via package manager like Chocolatey: choco install sshpass
    exit /b 1
)

where rsync >nul 2>&1
if errorlevel 1 (
    call :print_error "rsync is not installed. Please install it first:"
    echo 1. Download from: https://rsync.samba.org/download.html
    echo 2. Or install via package manager like Chocolatey: choco install rsync
    exit /b 1
)

call :print_status "Required tools are available ✓"

REM Test SSH connection
call :print_status "Testing SSH connection to %PI_USER%@%PI_HOST%:%PI_PORT%..."

sshpass -p "%PI_PASSWORD%" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -p "%PI_PORT%" "%PI_USER%@%PI_HOST%" "echo SSH connection successful"
if errorlevel 1 (
    call :print_error "Failed to connect to Raspberry Pi. Please check:"
    call :print_error "  - IP address is correct"
    call :print_error "  - SSH is enabled on the Pi"
    call :print_error "  - Username and password are correct"
    call :print_error "  - Port is correct (default: 22)"
    exit /b 1
)

call :print_status "SSH connection successful ✓"

REM Check if Pi is ready for deployment
call :print_status "Checking if Raspberry Pi is ready for deployment..."

sshpass -p "%PI_PASSWORD%" ssh -o StrictHostKeyChecking=no -p "%PI_PORT%" "%PI_USER%@%PI_HOST%" "command -v docker" >nul 2>&1
if errorlevel 1 (
    call :print_warning "Docker is not installed on the Pi. Installing..."
    call :install_docker_on_pi
) else (
    call :print_status "Docker is installed ✓"
)

sshpass -p "%PI_PASSWORD%" ssh -o StrictHostKeyChecking=no -p "%PI_PORT%" "%PI_USER%@%PI_HOST%" "command -v docker-compose" >nul 2>&1
if errorlevel 1 (
    call :print_warning "Docker Compose is not installed on the Pi. Installing..."
    call :install_docker_compose_on_pi
) else (
    call :print_status "Docker Compose is installed ✓"
)

REM Check if application directory exists
sshpass -p "%PI_PASSWORD%" ssh -o StrictHostKeyChecking=no -p "%PI_PORT%" "%PI_USER%@%PI_HOST%" "[ -d %PI_APP_DIR% ]" >nul 2>&1
if errorlevel 1 (
    call :print_status "Creating application directory on Pi..."
    sshpass -p "%PI_PASSWORD%" ssh -o StrictHostKeyChecking=no -p "%PI_PORT%" "%PI_USER%@%PI_HOST%" "mkdir -p %PI_APP_DIR%"
)

REM Upload application files
call :print_status "Uploading application files to Raspberry Pi..."

REM Create a temporary directory for files to upload
set TEMP_DIR=%TEMP%\minhmom-upload
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"

REM Copy files to temp directory
xcopy /E /I /Y . "%TEMP_DIR%"

REM Remove unnecessary files
if exist "%TEMP_DIR%\.git" rmdir /s /q "%TEMP_DIR%\.git"
if exist "%TEMP_DIR%\node_modules" rmdir /s /q "%TEMP_DIR%\node_modules"
if exist "%TEMP_DIR%\backend\__pycache__" rmdir /s /q "%TEMP_DIR%\backend\__pycache__"
if exist "%TEMP_DIR%\backend\app\__pycache__" rmdir /s /q "%TEMP_DIR%\backend\app\__pycache__"
if exist "%TEMP_DIR%\backend\app\routers\__pycache__" rmdir /s /q "%TEMP_DIR%\backend\app\routers\__pycache__"
if exist "%TEMP_DIR%\backend\app\tests\__pycache__" rmdir /s /q "%TEMP_DIR%\backend\app\tests\__pycache__"

REM Upload files using rsync
call :print_status "Syncing files to Pi..."
sshpass -p "%PI_PASSWORD%" rsync -avz --delete -e "ssh -o StrictHostKeyChecking=no -p %PI_PORT%" "%TEMP_DIR%/" "%PI_USER%@%PI_HOST%:%PI_APP_DIR%/"

REM Clean up
rmdir /s /q "%TEMP_DIR%"

call :print_status "Files uploaded successfully ✓"

REM Configure environment on Pi
call :print_status "Configuring environment on Raspberry Pi..."

REM Get Pi's IP address for configuration
for /f "tokens=*" %%i in ('sshpass -p "%PI_PASSWORD%" ssh -o StrictHostKeyChecking=no -p "%PI_PORT%" "%PI_USER%@%PI_HOST%" "hostname -I | awk '{print $1}'"') do set PI_IP=%%i

REM Create .env file on Pi
sshpass -p "%PI_PASSWORD%" ssh -o StrictHostKeyChecking=no -p "%PI_PORT%" "%PI_USER%@%PI_HOST%" "cd %PI_APP_DIR% && cat > .env << 'ENVEOF'
# MongoDB Configuration
MONGODB_URI=%MONGODB_URI%
DB_NAME=%DB_NAME%

# Frontend Configuration
VITE_API_BASE_URL=http://%PI_IP%:8000
VITE_GROUP_ID=%VITE_GROUP_ID%

# Backend Configuration
IMAGES_BASE_PATH=/app/images
CORS_ORIGINS=http://%PI_IP%:80,http://%PI_IP%:3000,http://%PI_IP%:5173
LOG_LEVEL=INFO

# Pi Configuration
PI_HOST=%PI_HOST%
PI_USER=%PI_USER%
PI_PASSWORD=%PI_PASSWORD%
PI_PORT=%PI_PORT%
PI_APP_DIR=%PI_APP_DIR%
ENVEOF"

call :print_status "Environment configured ✓"

REM Deploy application on Pi
call :print_status "Deploying application on Raspberry Pi..."

sshpass -p "%PI_PASSWORD%" ssh -o StrictHostKeyChecking=no -p "%PI_PORT%" "%PI_USER%@%PI_HOST%" "cd %PI_APP_DIR% && chmod +x deploy-pi.sh && docker-compose -f docker-compose.pi.yml down 2>/dev/null || true && docker-compose -f docker-compose.pi.yml up --build -d && sleep 15 && docker-compose -f docker-compose.pi.yml ps"

call :print_status "Application deployed on Raspberry Pi ✓"

REM Check deployment status
call :print_status "Checking deployment status..."

REM Check backend health
call :print_status "Checking backend health..."
sshpass -p "%PI_PASSWORD%" ssh -o StrictHostKeyChecking=no -p "%PI_PORT%" "%PI_USER%@%PI_HOST%" "curl -f http://localhost:8000/health" >nul 2>&1
if errorlevel 1 (
    call :print_warning "Backend health check failed"
) else (
    call :print_status "Backend is healthy ✓"
)

REM Check frontend health
call :print_status "Checking frontend health..."
sshpass -p "%PI_PASSWORD%" ssh -o StrictHostKeyChecking=no -p "%PI_PORT%" "%PI_USER%@%PI_HOST%" "curl -f http://localhost/health" >nul 2>&1
if errorlevel 1 (
    call :print_warning "Frontend health check failed"
) else (
    call :print_status "Frontend is healthy ✓"
)

call :print_status "Deployment completed!"
call :print_pi "Frontend: http://%PI_IP%"
call :print_pi "Backend API: http://%PI_IP%:8000"
call :print_pi "API Documentation: http://%PI_IP%:8000/docs"

goto :eof

:install_docker_on_pi
call :print_status "Installing Docker on Raspberry Pi..."
sshpass -p "%PI_PASSWORD%" ssh -o StrictHostKeyChecking=no -p "%PI_PORT%" "%PI_USER%@%PI_HOST%" "curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh && sudo usermod -aG docker $USER && rm get-docker.sh && echo Docker installed successfully"
call :print_status "Docker installation completed"
goto :eof

:install_docker_compose_on_pi
call :print_status "Installing Docker Compose on Raspberry Pi..."
sshpass -p "%PI_PASSWORD%" ssh -o StrictHostKeyChecking=no -p "%PI_PORT%" "%PI_USER%@%PI_HOST%" "sudo apt update && sudo apt install -y docker-compose && echo Docker Compose installed successfully"
call :print_status "Docker Compose installation completed"
goto :eof

