#!/bin/bash
# ==================================================================
#  ShopEase - Apache setup script for Ubuntu EC2
#
#  WHAT THIS SCRIPT DOES
#    1. Installs Apache (the web server program)
#    2. Starts Apache, and makes it start again after every reboot
#    3. Creates the empty uploads/ folder
#    4. Creates server-info.json  (this server's "name badge")
#    5. Tells Apache to use our 404.html page for missing pages
#    6. Lets the "ubuntu" user copy website files into the folder
#
#  WHAT IT DOES NOT DO
#    It does not copy your website. You copy your files into
#    /var/www/html yourself after this script finishes.
#
#  HOW TO RUN IT (pick one)
#    a) EC2 > Launch instance > Advanced details > User data > paste
#       (AWS runs it automatically as root on the first boot)
#    b) On a running server:  sudo bash user-data-ubuntu.sh
# ==================================================================


# ------------------------------------------------------------------
# STEP 1: Install Apache
# ------------------------------------------------------------------
# "apt" is Ubuntu's app store for the command line.
# "update" downloads the latest list of available software.
apt update -y

# Install Apache. On Ubuntu its package name is "apache2".
# "-y" = answer "yes" automatically (no one is there to type it).
apt install -y apache2


# ------------------------------------------------------------------
# STEP 2: Start Apache
# ------------------------------------------------------------------
# "start"  = run Apache right now.
# "enable" = run Apache automatically every time the server reboots.
# From now on Apache listens on port 80 and serves everything
# inside /var/www/html (Apache's website folder, the "DocumentRoot").
systemctl start apache2
systemctl enable apache2


# ------------------------------------------------------------------
# STEP 3: Create the uploads/ folder
# ------------------------------------------------------------------
# An empty folder required by the project.
# "-p" = don't complain if the folder already exists.
mkdir -p /var/www/html/uploads


# ------------------------------------------------------------------
# STEP 4: Create server-info.json (the server's "name badge")
# ------------------------------------------------------------------
# Every server has the SAME website files, so visitors can't tell
# which server answered. This small file is DIFFERENT on each
# server, and the website shows it as "Served by: hostname / AZ".

# 4a. Ask AWS for a short-lived security token.
#     169.254.169.254 is a special address that only works from
#     inside an EC2 server. It answers questions about the server
#     itself (this is called "instance metadata").
#     AWS requires a token first (IMDSv2) for security.
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

# 4b. Use the token to ask: "Which Availability Zone am I in?"
#     The answer looks like: us-east-1a
AZ=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/placement/availability-zone)

# 4c. Get this server's name (no AWS needed for this one).
#     The answer looks like: ip-172-31-20-15.ec2.internal
SERVER_NAME=$(hostname -f)

# 4d. Write both values into the file inside Apache's folder.
#     Result: {"hostname": "ip-172-31-20-15.ec2.internal", "az": "us-east-1a"}
#     js/main.js on the website reads this file and shows the badge.
echo "{\"hostname\": \"$SERVER_NAME\", \"az\": \"$AZ\"}" > /var/www/html/server-info.json


# ------------------------------------------------------------------
# STEP 5: Use our own 404 page
# ------------------------------------------------------------------
# By default Apache shows a plain "Not Found" page.
# This one-line config tells it to show our 404.html instead.
echo "ErrorDocument 404 /404.html" > /etc/apache2/conf-available/shopease.conf

# Ubuntu only uses configs that are switched on with "a2enconf"
# (short for "Apache 2 enable config").
a2enconf shopease

# "reload" = Apache re-reads its settings without stopping.
systemctl reload apache2


# ------------------------------------------------------------------
# STEP 6: Permissions, so you can copy your website in
# ------------------------------------------------------------------
# /var/www/html belongs to "root" (the admin), so copying files
# as the normal "ubuntu" user would fail with "Permission denied".
#   ubuntu   = owner -> you can copy files in with scp
#   www-data = group -> the user Apache runs as, so it can still read them
#   -R       = apply to everything inside the folder too
chown -R ubuntu:www-data /var/www/html


# ------------------------------------------------------------------
# DONE
# ------------------------------------------------------------------
# Next: copy your website files into /var/www/html.
# Until then, Apache shows its default "It works!" page.
echo "Setup finished on $SERVER_NAME in $AZ"
