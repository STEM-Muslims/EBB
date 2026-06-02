import os

import boto3

DATABASE_URL = os.environ["DATABASE_URL"]

AWS_REGION = os.environ["AWS_REGION"]
AWS_S3_ACCESS_KEY = os.environ["AWS_S3_ACCESS_KEY"]
AWS_S3_SECRET_ACCESS_KEY = os.environ["AWS_S3_SECRET_ACCESS_KEY"]

S3_BUCKET_NAME = os.environ["S3_BUCKET_NAME"]


s3_client = boto3.client(
    "s3",
    region_name=AWS_REGION,
    aws_access_key_id=AWS_S3_ACCESS_KEY,
    aws_secret_access_key=AWS_S3_SECRET_ACCESS_KEY,
)
