# S3 CORS Configuration for Font Loading

## Why CORS Is Needed

Browsers enforce the Same-Origin Policy on font files loaded via `@font-face`. When fonts are served from a different origin (e.g., `d1fmdyqfafwim3.cloudfront.net`) than the page (e.g., `therealityreport.com`), the browser blocks the request unless the server returns proper `Access-Control-Allow-Origin` headers. Without CORS, fonts fail to load silently or with a console error.

## Step 1: Apply CORS on the S3 Bucket

The IAM user `trr-backend` lacks `s3:PutBucketCORS` permission, so this must be done manually via the AWS Console.

1. Open the [S3 Console](https://s3.console.aws.amazon.com/s3/home)
2. Navigate to the **trr-backend** bucket
3. Go to the **Permissions** tab
4. Scroll to **Cross-origin resource sharing (CORS)** and click **Edit**
5. Paste the contents of [`s3-font-cors.json`](./s3-font-cors.json)
6. Click **Save changes**

> If the IAM user gains `s3:PutBucketCORS` permission later, apply via CLI instead:
> ```bash
> aws s3api put-bucket-cors --bucket trr-backend --cors-configuration file://scripts/s3-font-cors.json
> ```

## Step 2: Configure CloudFront to Forward the Origin Header

S3 only returns CORS headers when the request includes an `Origin` header. CloudFront must be configured to forward it.

**Option A -- Response Headers Policy (recommended):**
1. In the CloudFront Console, open the distribution for `d1fmdyqfafwim3.cloudfront.net`
2. Create or edit a cache behavior for the `/fonts/*` path pattern
3. Attach a **Response Headers Policy** with CORS configured:
   - Access-Control-Allow-Origin: the same origins listed in `s3-font-cors.json`
   - Access-Control-Allow-Methods: `GET, HEAD`
   - Access-Control-Max-Age: `86400`

**Option B -- Origin Request Policy:**
1. On the same cache behavior, attach an **Origin Request Policy** that includes the `Origin` header
2. This ensures CloudFront forwards `Origin` to S3 so S3 returns the CORS headers itself
3. Also add `Origin` to the cache key so responses are cached per-origin

## Step 3: Verify

After applying both S3 CORS and the CloudFront config, test with:

```bash
curl -I -H "Origin: https://therealityreport.com" \
  "https://d1fmdyqfafwim3.cloudfront.net/fonts/monotype/hamburg-serial/HamburgSerial-Bold.woff2"
```

The response should include:

```
access-control-allow-origin: https://therealityreport.com
access-control-allow-methods: GET, HEAD
```

If you see the headers, CORS is working. If not, invalidate the CloudFront cache (`/*`) and retry -- CloudFront may have cached the response without CORS headers.
