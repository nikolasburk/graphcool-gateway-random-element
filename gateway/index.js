const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const graphqlExpress = require('apollo-server-express').graphqlExpress
const transformSchema = require('graphql-transform-schema').transformSchema
const makeRemoteExecutableSchema = require('graphql-tools').makeRemoteExecutableSchema
const mergeSchemas = require('graphql-tools').mergeSchemas
const introspectSchema = require('graphql-tools').introspectSchema
const HttpLink = require('apollo-link-http').HttpLink
const fetch = require('node-fetch')
const { expressPlayground } = require('graphql-playground-middleware')
const request = require('graphql-request').request

const allItemsQuery = `
query {
  allItems {
    id
  }
  _allItemsMeta {
    count
  }
}
`

const singleItemQuery = `
query ($id: ID!) {
  Item(id: $id) {
    id
    title
  }
}
`

function run() {

  // Step 1: Create local version of the CRUD API
  const endpoint = '__SIMPLE_API_ENDPOINT__'  // looks like: https://api.graph.cool/simple/v1/cj9oi2m4d087a0118pabkfsxm
  const link = new HttpLink({ uri: endpoint, fetch })
  introspectSchema(link).then(introspectionSchema => {
    const graphcoolSchema = makeRemoteExecutableSchema({
      schema: introspectionSchema,
      link
    })

    // Step 2: Define schema for the new API
    const extendTypeDefs = `
      extend type Query {
        randomItem: Item
      }
    `

    // Step 3: Merge remote schema with new schema
    const mergedSchemas = mergeSchemas({
      schemas: [graphcoolSchema, extendTypeDefs],
      resolvers: mergeInfo => ({
        Query: {
          randomItem: {
            resolve: () => {
              return request(endpoint, allItemsQuery).then(data => {
                const { count } = data._allItemsMeta
                const randomIndex = Math.floor((Math.random() * (count-1)) + 0)
                const { id } = data.allItems[randomIndex]
                return request(endpoint, singleItemQuery, { id }).then(data => data.Item)
              })
            },
          }
        },
      }),
    })

    // Step 4: Limit exposed operations from merged schemas
    // Hide every root field except `randomItem`
    const schema = transformSchema(mergedSchemas, {
      '*': false,
      randomItem: true,
    })

    const app = express()

    app.use('/graphql', cors(), bodyParser.json(), graphqlExpress({ schema }))
    app.use('/playground', expressPlayground({ endpoint: '/graphql' }))

    const { PORT = 3000 } = process.env

    app.listen(PORT, () => console.log(`Server running. Open http://localhost:${PORT}/playground to run queries.`))
  })

}

run()
