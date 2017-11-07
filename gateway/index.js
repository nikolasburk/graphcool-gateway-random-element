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
const playground  = require('graphql-playground/middleware').express
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
  const endpoint = 'https://api.graph.cool/simple/v1/cj9oi2m4d087a0118pabkfsxm'  // looks like: https://api.graph.cool/simple/v1/__SERVICE_ID__
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
                console.log(`received data: ${JSON.stringify(data)}`)
                const { count } = data._allItemsMeta
                const randomIndex = Math.floor((Math.random() * (count-1)) + 0)
                console.log(`random index: ${randomIndex}`)
                const itemId = data.allItems[randomIndex].id
                console.log(`random id: ${itemId}`)
                return request(endpoint, singleItemQuery, {
                  id: itemId
                }).then(data => {
                  console.log(`received item: ${JSON.stringify(data)}`)
                  const item = data.Item
                  console.log(`return actual item: ${JSON.stringify(item)}`)
                  return item
                })
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

    app.use('/graphql', cors(), bodyParser.json(), graphqlExpress({ mergedSchemas }))
    app.use('/playground', playground({ endpoint: '/graphql' }))

    app.listen(3000, () => console.log('Server running. Open http://localhost:3000/playground to run queries.'))
  })

}

run()
