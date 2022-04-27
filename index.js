'use strict';

async function main(bucketName, directoryPath, keyFile) {
  const {Storage} = require('@google-cloud/storage');
  const fs = require('fs');
  const path = require('path');
  const fileList = [];

  async function uploadDirectory() {
   
    const storage = new Storage({keyFilename: keyFile});

    let dirCtr = 1;
    let itemCtr = 0;
    const pathDirName = path.dirname(directoryPath);

    getFiles(directoryPath);

    function getFiles(directory) {
      fs.readdir(directory, (err, items) => {
        dirCtr--;
        itemCtr += items.length;
        items.forEach(item => {
          const fullPath = path.join(directory, item);
          fs.stat(fullPath, (err, stat) => {
            itemCtr--;
            if (stat?.isFile()) {
              fileList.push(fullPath);
            } else if (stat?.isDirectory()) {
              dirCtr++;
              getFiles(fullPath);
            }
            if (dirCtr === 0 && itemCtr === 0) {
              onComplete();
            }
          });
        });
      });
    }

    async function onComplete() {
      const resp = await Promise.all(
        fileList.map(filePath => {
          let destination = path.relative(pathDirName, filePath);
          if (process.platform === 'win32') {
            destination = destination.replace(/\\/g, '/');
          }
          return storage
            .bucket(bucketName)
            .upload(filePath, {destination})
            .then(
              uploadResp => ({fileName: destination, status: uploadResp[0]}),
              err => ({fileName: destination, response: err})
            );
        })
      );

      const successfulUploads =
        fileList.length - resp.filter(r => r.status instanceof Error).length;
      console.log(
        `${successfulUploads} files uploaded to ${bucketName} successfully.`
      );
    }
  }

  uploadDirectory().catch(console.error)
}

main(...process.argv.slice(2)).catch(console.error);