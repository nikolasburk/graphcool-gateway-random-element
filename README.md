# API Gateway (Random Element)

## Overview

This example demonstrates how to use an **API gateway on top of a Graphcool CRUD API allowing to retrieve a random element**. The idea is to add a resolver `randomItem` that retrieves the item.


## Get started

### 1. Download the example

```sh
git clone git@github.com:nikolasburk/graphcool-gateway-random-element.git
cd graphcool-gateway-random-element
```

### 2. Install the Graphcool CLI

If you haven't already, go ahead and install the [Graphcool CLI](https://docs-next.graph.cool/reference/graphcool-cli/overview-zboghez5go):

```sh
npm install -g graphcool
```

### 3. Deploy the Graphcool service

The next step is to [deploy](https://graph.cool/docs/reference/graphcool-cli/commands-aiteerae6l#graphcool-deploy) the Graphcool service that's defined inside the [`service`](./service) directory:

```sh
cd service
graphcool deploy
```

When prompted which cluster you'd like to deploy, choose any of **Shared Clusters**-options (`shared-eu-west-1`, `shared-ap-northeast-1` or `shared-us-west-2`) rather than `local`. 

Then copy the endpoint for the `Simple API`, you'll need it in the next step.

The service you just deployed provides a CRUD API for the `Item` model type defined in [`./service/types.graphql`](./service/types.graphql).

### 4. Configure and start the API gateway server

#### 4.1. Set the endpoint for the GraphQL CRUD API

You first need to connect the gateway to the CRUD API. 

Paste the the HTTP endpoint for the `Simple API` from the previous step into [`./gateway/index.js`](./gateway/index.js#L37) as the value for `endpoint`, replacing the current placeholder `__SIMPLE_API_ENDPOINT__`:

```js
const endpoint = '__SIMPLE_API_ENDPOINT__' // looks like: https://api.graph.cool/simple/v1/__SERVICE_ID__ where __SERVICE_ID__ is a placeholder consisting of 25 alphanumeric characters
```

> **Note**: If you ever lose your API endpoint, you can get access to it again by running `graphcool info` in the root directory of your service (where [`graphcool.yml`](./service/graphcool.yml) is located).

#### 4.2. Start the server

Navigate into the [`gateway`](./gateway) directory, install the node dependencies and start the server:

```sh
cd ../gateway
yarn install
yarn start
```

#### 4.3. Open GraphQL Playground

The API that's exposed by the gateway is now available inside a GraphQL Playground under the following URL:

[`http://localhost:3000/playground`](http://localhost:3000/playground)


## Usage

### 1. Create dummy data using the CRUD API

Before you start running queries against the API gateway, you should create somme dummy data in your service's database. You'll do this with a GraphQL Playground that's running against the CRUD API (not the API gateway).

Navigate back into the [`service`](./service) directory and open a Playground:

```sh
cd ../server
graphcool playground
```

In the Playground, send the following mutation to create five new `Item` nodes:

```graphql
mutation {
  a: createItem(title: "a") {
    id
  }
  b: createItem(title: "b") {
    id
  }
  c: createItem(title: "c") {
    id
  }
  d: createItem(title: "d") {
    id
  }
  e: createItem(title: "e") {
    id
  }
}
```


### 2. Send queries to the API gateway

Now, that there's some initial data in the database, you can use the API gateway to fetch the data through the exposed API. Note that these queries have to be run in the Playground that's running on your localhost: [`http://localhost:3000/playground`](http://localhost:3000/playground).

Send the following query to fetch the posts that you just created:

```graphql
{
  randomItem {
    id
    title
  }
}
```


## What's in this example?

The API gateway is a thin layer on top of the Graphcool service's CRUD API. For this example, the CRUD API is based on the following data model defined in the service's [`types.graphql`](./service/types.graphql):

```graphql
type Item @model {
  id: ID! @isUnique
  title: String!
}
```

The API gateway now creates another API that will be exposed to the clients. The server that exposes this API is executing its queries against the underlying CRUD API. The magic enabling this functionality is implemented in the [`run`](./gateway/index.js#L34) function in [`index.js`](./gateway/index.js).

Here's the schema that defines the new API:

```graphql
type Query {
  randomItem: Item
}
```

There are four major steps that are being performed to map the CRUD API to the new schema:

1. Create local version of the CRUD API using [`makeRemoteExecutableSchema`](http://dev.apollodata.com/tools/graphql-tools/remote-schemas.html#makeRemoteExecutableSchema). [See the code](./gateway/index.js#L40).
2. Define schema for the new API (the one exposed by the API gateway). [See the code](./gateway/index.js#L45).
3. Merge remote schema with new schema using [`mergeSchemas`](http://dev.apollodata.com/tools/graphql-tools/schema-stitching.html#mergeSchemas). [See the code](./gateway/index.js#L52).
4. Limit exposed operations from merged schemas (hiding all root fields except `randomItem`) using [`transformSchema`](https://github.com/graphcool/graphql-transform-schema). [See the code](./gateway/index.js#71).




