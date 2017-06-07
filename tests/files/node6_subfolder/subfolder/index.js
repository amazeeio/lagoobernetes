const express = require('express')
const app = express()

app.get('/', function (req, res) {
  res.send(`AMAZEEIO_GIT_SHA: ${process.env.AMAZEEIO_GIT_SHA} <br> AMAZEEIO_GIT_BRANCH: ${process.env.AMAZEEIO_GIT_BRANCH}`)
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})