#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}BFP Emergency System - Setup Verification${NC}"
echo -e "${YELLOW}========================================${NC}\n"

# Check if Node.js is installed
echo -e "${YELLOW}Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js ${NODE_VERSION} is installed${NC}"
else
    echo -e "${RED}✗ Node.js is not installed${NC}"
    exit 1
fi

# Check if npm is installed
echo -e "${YELLOW}Checking npm...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm ${NPM_VERSION} is installed${NC}"
else
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi

# Check if MySQL is installed
echo -e "${YELLOW}Checking MySQL...${NC}"
if command -v mysql &> /dev/null; then
    echo -e "${GREEN}✓ MySQL is installed${NC}"
else
    echo -e "${RED}✗ MySQL is not installed${NC}"
    exit 1
fi

echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Database Setup${NC}"
echo -e "${YELLOW}========================================${NC}\n"

echo -e "${YELLOW}1. Create database and tables:${NC}"
echo "mysql -u root -p < bfp_emergency_system.sql"

echo -e "\n${YELLOW}2. Apply authentication migration:${NC}"
echo "mysql -u root -p bfp_emergency_system < backend/migrations/001_add_auth_columns.sql"

echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Backend Setup${NC}"
echo -e "${YELLOW}========================================${NC}\n"

echo -e "${YELLOW}1. Install backend dependencies:${NC}"
echo "cd backend && npm install"

echo -e "\n${YELLOW}2. Start backend server:${NC}"
echo "node server.js"

echo -e "\n${YELLOW}Expected output:${NC}"
echo -e "${GREEN}Database connection established successfully.${NC}"
echo -e "${GREEN}Server is running on http://localhost:5000${NC}"

echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Frontend Setup${NC}"
echo -e "${YELLOW}========================================${NC}\n"

echo -e "${YELLOW}1. Install frontend dependencies:${NC}"
echo "npm install"

echo -e "\n${YELLOW}2. Start frontend server:${NC}"
echo "npm run dev"

echo -e "\n${YELLOW}Expected output:${NC}"
echo -e "${GREEN}VITE v... ready in xxx ms${NC}"
echo -e "${GREEN}➜  Local:   http://localhost:5173/${NC}"

echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Test Credentials${NC}"
echo -e "${YELLOW}========================================${NC}\n"

echo -e "${GREEN}Admin User:${NC}"
echo "ID: BFP-00001"
echo "Password: admin123"

echo -e "\n${GREEN}Substation Admin:${NC}"
echo "ID: BFP-00002"
echo "Password: admin123"

echo -e "\n${GREEN}Driver:${NC}"
echo "ID: BFP-00003"
echo "Password: admin123"

echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Testing the System${NC}"
echo -e "${YELLOW}========================================${NC}\n"

echo "1. Go to http://localhost:5173"
echo "2. You should see the login page"
echo "3. Login with one of the test credentials above"
echo "4. You should be redirected to the dashboard"
echo "5. Click on the user avatar to see logout option"

echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Documentation${NC}"
echo -e "${YELLOW}========================================${NC}\n"

echo "- QUICK_START.md - Quick reference guide"
echo "- AUTHENTICATION_SETUP.md - Detailed documentation"
echo "- IMPLEMENTATION_SUMMARY.md - What was implemented"

echo -e "\n${YELLOW}========================================${NC}"
echo -e "${GREEN}Setup verification complete!${NC}"
echo -e "${YELLOW}========================================${NC}\n"
