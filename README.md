# Discord PDF Bot

The idea of this project is to provide an API to retrieve all PDF books sent to a discord channel.
The books are analyzed via the PDF metadata and using AI they are classified into different categories.
The api also provides some extra information which can be used to for the front end, such as uploader, uploader avatar, etc.

```
📁 discord-pdf-ts
   |-- 📄 .env
   |-- 📄 .env.example
   |-- 📄 .gitignore
   |-- 📄 .prettierignore
   |-- 📄 books.db
   |-- 📄 books_.db
   |-- 📄 package-lock.json
   |-- 📄 package.json
   |-- 📄 tsconfig.json
   |-- 📁 logs
   |-- 📁 src
       |-- 📄 server.ts
       |-- 📁 config
       |-- 📁 controllers
       |-- 📁 db
       |   |-- 📄 knexfile.ts
       |   |-- 📁 migrations
       |-- 📁 middleware
       |-- 📁 services
       |-- 📁 types
       |-- 📁 utils
       |-- 📁 workers
```

## Docker Compose

Docker is needed to run the local AMPQ instance.
This is where jobs are enqeued.

`docker-compose up -d`

Then at .env:

```
amqp://user:password@localhost:5672
```
