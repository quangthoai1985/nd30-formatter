import fs from 'fs';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const MINERU_API_KEY = "eyJ0eXBlIjoiSldUIiwiYWxnIjoiSFM1MTIifQ.eyJqdGkiOiI4NTQwMDAwMCIsInJvbCI6IlJPTEVfUkVHSVNURVIiLCJpc3MiOiJPcGVuWExhYiIsImlhdCI6MTc3NTg5NjY0MCwiY2xpZW50SWQiOiJsa3pkeDU3bnZ5MjJqa3BxOXgydyIsInBob25lIjoiIiwib3BlbklkIjpudWxsLCJ1dWlkIjoiNWIyMGRhNjgtNGYyNy00OGEwLWJmYTgtZDUyMmUxZmMzMzY2IiwiZW1haWwiOiJRdWFuZ3Rob2FpcGhvdG9AZ21haWwuY29tIiwiZXhwIjoxNzgzNjcyNjQwfQ.e2ROpVHwsPd3awy0XdF9cqtGP0Ih4TMVIJdGOpFTCT8L5JjeM5YEZ14Eg0aSWveEkI37XQTL2uXOUm9JuV24Yg";

  console.log('1. Getting upload URL...');
  const initRes = await fetch('https://mineru.net/api/v4/file-urls/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MINERU_API_KEY}`
    },
    body: JSON.stringify({
      files: [{ name: 'test.pdf' }]
    })
  });
  
  const initData = await initRes.json();
  console.log('Init Data:', initData);
  
  const batchId = initData.data.batch_id;
  const s3Url = initData.data.file_urls[0];

  console.log('2. Uploading file to S3...');
  // We use the ND30.pdf as dummy file just to see if it triggers
  const fileBuffer = fs.readFileSync('ND30.pdf'); 
  const uploadRes = await fetch(s3Url, {
    method: 'PUT',
    body: fileBuffer
  });

  console.log('Upload status:', uploadRes.status);
  
  console.log('3. Polling batch status...');
  for (let i = 0; i < 5; i++) {
    await delay(3000);
    const pollRes = await fetch(`https://mineru.net/api/v4/extract-results/batch/${batchId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MINERU_API_KEY}`
      }
    });
    console.log(`Poll [${i}] status:`, pollRes.status);
    const pollData = await pollRes.json();
    console.log('Poll data:', JSON.stringify(pollData, null, 2));
    
    if (pollData.code === 0 && pollData.data) {
        if (pollData.data.state === 'done' || pollData.data.state === 'error' || pollData.data.state === 'failed') break;
    }
  }

})();

