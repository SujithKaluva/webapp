#!/bin/bash
sudo yum update
sudo yum upgrade
sudo amazon-linux-extras install -y nginx1
sudo amazon-linux-extras install -y epel

sudo yum install -y curl
curl -sL https://rpm.nodesource.com/setup_16.x | sudo -E bash -
sudo yum install -y nodejs

mkdir webapp
mv webapp.zip webapp/
cd webapp
unzip webapp.zip
rm webapp.zip

npm install
cd ..
sudo chmod 755 webapp
