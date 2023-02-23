source "amazon-ebs" "my-ami" {
  ami_name        = "csye6225_${formatdate("YYYY_MM_DD_hh_mm_ss", timestamp())}"
  ami_description = " AMI for CSYE 6225"
  instance_type   = "t2.micro"
  region          = "${var.aws_region}"
//   profile         = "${var.aws_profile}"
  ssh_username    = "${var.ssh_username}"
  source_ami      = "${var.source_ami}"
  access_key      = "${var.aws_access_key_id}"
  secret_key      = "${var.aws_secret_access_key}"
  ami_users       = ["${var.dev_profile_id}", "${var.demo_profile_id}"]
  ami_regions     = ["${var.aws_region}"]
  aws_polling {
    delay_seconds = 120
    max_attempts  = 50
  }

  ami_block_device_mappings {
    delete_on_termination = true
    device_name           = "/dev/xvda"
    volume_size           = 8
    volume_type           = "gp2"
  }
}

build {
  name = "build-packer"
  sources = [
    "source.amazon-ebs.my-ami"
  ]

  provisioner "file" {
    source      = "${var.source_filename}"
    destination = "webapp.zip"
  }

  provisioner "shell" {
    script = "script.sh"
  }

}

///Variable Declaration
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "aws_profile" {
  type    = string
  default = "dev"
}
variable "source_ami" {
  type    = string
  default = "ami-0dfcb1ef8550277af"
}

variable "dev_profile_id" {
  type    = string
  default = "777406068262"
}

variable "demo_profile_id" {
  type    = string
  default = "284360844036"
}

variable "ssh_username" {
  type    = string
  default = "ec2-user"
}

variable "subnet_id" {
  type    = string
  default = "subnet-0c5fd8efd5220719b"
}

variable "aws_access_key_id" {
  type    = string
  default = env("aws_access_key_id")
}

variable "aws_secret_access_key" {
  type    = string
  default = env("aws_secret_access_key")
}

variable "source_filename" {
  type    = string
  default = "webapp.zip"
}
///Variable Declaration