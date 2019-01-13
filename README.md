# @gorlug/pouchdb-log-writer

Write pouchdb logs to file

# Usage

`node build/main/index.js config.json`

Example json config:

```
{                                                                                                                                                                                                                    
    "db": {                                                                                                                                                                                                          
        "host": "couchdb",                                                                                                                                                                                           
        "port": 5984,                                                                                                                                                                                                
        "dbName": "dev-log"                                                                                                                                                                                          
    },                                                                                                                                                                                                               
    "loggingUser": {                                                                                                                                                                                                 
        "username": "loggingUser",                                                                                                                                                                                   
        "password": "somepassword"                                                                                                                                                                                   
    },                                                                                                                                                                                                               
    "admin": {                                                                                                                                                                                                       
        "username": "admin",                                                                                                                                                                                         
        "password": "admin"                                                                                                                                                                                          
    },                                                                                                                                                                                                               
    "logger": {                                                                                                                                                                                                      
        "path": "/logs/pouchDBWrapper.log"                                                                                                                                                                           
    }                                                                                                                                                                                                                
}       
```
