#!/bin/bash

aws ec2 describe-instances --output text --query 'Reservations[*].Instances[*].[ImageId,Tags[*].Key,Tags[*].Value]' | grep -e "\bName\b" | grep -e "\b${1}\b" | awk '{print $1}'
