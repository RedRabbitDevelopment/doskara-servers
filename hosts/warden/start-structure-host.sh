#!/bin/bash

read id ip <<< $(aws ec2 run-instances --image-id ami-9cbdd2ac --security-group-ids sg-4b894a2e --instance-type t1.micro --subnet-id subnet-18739e7d --output text --query 'Instances[*].[InstanceId,PrivateIpAddress]')

echo "New instance id is $id"
echo "New instance ip is $ip"
