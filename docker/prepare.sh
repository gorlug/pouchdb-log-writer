#!/bin/bash

rm -rf log-file-writer
mkdir log-file-writer
cp ../package* log-file-writer/
cp -r ../build log-file-writer/
cp -r ../etc log-file-writer/
cd log-file-writer
npm install --production
