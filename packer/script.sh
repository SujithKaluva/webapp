#!/bin/bash
sudo yum update
sudo yum upgrade
sudo amazon-linux-extras install -y nginx1
sudo amazon-linux-extras install -y epel

sudo yum install -y curl
curl -sL https://rpm.nodesource.com/setup_16.x | sudo -E bash -
sudo yum install -y nodejs

# sudo yum install -y https://dev.mysql.com/get/mysql80-community-release-el7-5.noarch.rpm
# sudo yum install -y mysql-community-server
# sudo systemctl start mysqld
# sudo systemctl enable mysqld
# passwords=$(sudo grep 'temporary password' /var/log/mysqld.log | awk {'print $13'})
# mysql -u root -p$passwords --connect-expired-password -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'Sujith@123';"
# mysql -u root -pSujith@123 -e "create database userDB;"

# sudo mysql -u root -pSujith@123 <<EOF
# CREATE USER 'sujith'@'localhost' IDENTIFIED BY 'Sujith@123';
# GRANT ALL PRIVILEGES ON userDB.* TO 'sujith'@'localhost' WITH GRANT OPTION;
# FLUSH PRIVILEGES;
# EOF

# echo 'export DB_DATABASE=userDB' >> ~/.bashrc
# echo 'export DB_USER=sujith' >> ~/.bashrc
# echo 'export DB_PASSWORD=Sujith@123' >> ~/.bashrc
# echo 'export DB_HOST=localhost' >> ~/.bashrc

mkdir webapp
mv webapp.zip webapp/
cd webapp
unzip webapp.zip
rm webapp.zip
# cd webapp
npm install
cd ..
sudo chmod 755 webapp


# touch webapp.service
# cat <<EOF >> webapp.service
# [Unit]
# Description=Webapp Service
# After=network.target

# [Service]
# Environment="DB_DATABASE=userDB"
# Environment="DB_USER=sujith"
# Environment="DB_PASSWORD=Sujith@123"
# Environment="DB_HOST=localhost"
# Type=simple
# User=ec2-user
# WorkingDirectory=/home/ec2-user/webapp
# ExecStart=/usr/bin/node server.js
# Restart=on-failure

# [Install]
# WantedBy=multi-user.target
# EOF
# sudo mv webapp.service /etc/systemd/system/
# sudo systemctl daemon-reload
# sudo systemctl start webapp.service
# sudo systemctl status webapp.service
# sudo systemctl enable webapp.service

