#!/bin/bash

rm -rf pouchdb-log-writer
mkdir pouchdb-log-writer
cp ../package* pouchdb-log-writer/
cp -r ../build pouchdb-log-writer/
cp -r ../etc pouchdb-log-writer/
cd pouchdb-log-writer
npm install --production
