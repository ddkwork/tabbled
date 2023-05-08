<div align="center" width="100%">
    <img src="public/favicon.png" width="98" alt="" />
</div>
<h1 align="center">
  Tabbled
</h1>

<div align="center" width="100%">
<img src="https://img.shields.io/github/last-commit/tabbled/tabbled" /></a>
<a target="_blank" href="https://github.com/louislam/uptime-kuma"><img src="https://img.shields.io/github/stars/tabbled" /></a>
</div>

It's a low-code platform for building web application for enterprise, to manage internal processes of business.


## ⭐ Features

* Drag-and-drop user interface configuration
* Built-in data sources or connections to existing databases like PostgreSQL, MySQL, MongoDB, etc.
* Scripting - JavaScript works anywhere
* Functions - cloud functions, evaluating on the server side 
* Permission - you can limit access to any data for users and groups
* Live data - each device gets synchronized data in real-time
* Offline working - the data you chose as offline will be available offline wherever you go

## 🌿 Roadmap

- [x] Sign in and sign on
- [x] Types implementation
- [x] Table editor
- [x] Page designer
- [x] Progressive Web App
- [x] View editor
- [x] Store user data and config in IndexedDB
- [x] DataSource setting page
- [x] Menu setting page
- [x] Table cell editor widgets
- [x] Functions
- [ ] DataSources 
  - [x] Internal DataSource
  - [x] Custom DataSource
  - [x] Field DataSource
  - [ ] REST API
  - [ ] Databases:
    - [ ] PostgresSQL
    - [ ] MongoDB
    - [ ] MySQL
- [x] Dockerized entire project in the one image
- [ ] Desktop version
- [ ] Mobile version

## 🚀 How to Install

**1.Download the docker-compose file example**
```shell
https://raw.githubusercontent.com/tabbled/tabbled/main/docker-compose.yaml
```
**2.Create an .env file with configuration**

Download the example docker-compose file and pass contained variables
```shell
wget https://raw.githubusercontent.com/tabbled/tabbled/main/.env.example
```

**3.Create a docker volume for PostgresSQL data**

```shell
docker volume create pg_data
```

**4.Install and start Tabbled application**
```shell
docker compose up
```

**5.Open `localhost` on a web browser.**

Note: Default login:password are admin:admin

## 	Support

Tabbled is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers.

If you love this project, please consider giving a ⭐.

## License

[MIT](https://github.com/tabbled/tabbled/LICENSE)
