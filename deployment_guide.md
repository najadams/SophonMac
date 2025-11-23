# POS Client AWS Deployment Guide (EC2)

This guide details how to deploy the POS Client to **Amazon AWS EC2** using Docker Compose. This "Lift and Shift" approach is simple, robust, and cost-effective for staging environments.

## Prerequisites

1.  **AWS Account**: Access to the AWS Console.
2.  **SSH Key Pair**: A `.pem` key pair for accessing your EC2 instance.
3.  **Domain Name (Optional)**: If you want a custom URL (e.g., `pos.example.com`).

## Step 1: Launch an EC2 Instance

1.  **Log in to AWS Console** and navigate to **EC2**.
2.  **Launch Instance**:
    *   **Name**: `POS-Client-Staging`
    *   **AMI**: Ubuntu Server 22.04 LTS (HVM), SSD Volume Type (Free tier eligible).
    *   **Instance Type**: `t3.small` (Recommended for staging) or `t2.micro` (Free tier, but might be slow for builds).
    *   **Key Pair**: Select your existing key pair or create a new one.
    *   **Network Settings**:
        *   Create a new Security Group.
        *   **Allow SSH traffic from**: My IP (for security).
        *   **Allow HTTP traffic from**: Anywhere (0.0.0.0/0).
        *   **Allow HTTPS traffic from**: Anywhere (0.0.0.0/0).
3.  **Launch** the instance.

## Step 2: Prepare the Server

1.  **SSH into your instance**:
    ```bash
    ssh -i "your-key.pem" ubuntu@your-ec2-public-ip
    ```

2.  **Install Docker & Docker Compose**:
    Run the following commands on the EC2 instance:

    ```bash
    # Update packages
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg

    # Add Docker's official GPG key
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    # Set up the repository
    echo \
      "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Add ubuntu user to docker group (avoids using sudo for docker)
    sudo usermod -aG docker $USER
    ```
    *Log out and log back in for the group change to take effect.*

## Step 3: Deploy the Application

1.  **Transfer Files**:
    You can use `git` (recommended) or `scp`.

    **Option A: Git (Recommended)**
    ```bash
    git clone https://github.com/your-repo/pos-client.git
    cd pos-client
    ```

    **Option B: SCP (Copy local files)**
    On your local machine:
    ```bash
    scp -i "your-key.pem" -r ./backend ./frontend docker-compose.yml ubuntu@your-ec2-public-ip:~/app
    ```

2.  **Configure Environment**:
    Create the `.env` file on the server:
    ```bash
    nano .env
    ```
    Paste your configuration:
    ```env
    # REAL Umbrella Core URL
    UMBRELLA_CORE_URL=https://api.umbrella-core.com/api
    
    # Auth Token (if needed)
    COMPANY_AUTH_TOKEN=your_production_token
    ```

3.  **Start the Application**:
    ```bash
    docker compose up -d --build
    ```

## Step 4: Verification

1.  **Access the App**: Open your browser and visit `http://your-ec2-public-ip`.
2.  **Check Logs**:
    ```bash
    docker compose logs -f
    ```
3.  **Verify Sync**:
    *   Go to **Settings > Umbrella Network**.
    *   Ensure status is **Online**.

## Maintenance

*   **Update App**:
    ```bash
    git pull
    docker compose up -d --build
    ```
*   **View Database**:
    The SQLite database is persisted in `./backend/data`. You can SCP this file down to your local machine for inspection if needed.
