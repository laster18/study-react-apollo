import React, { useState, useRef, useCallback } from 'react'
import { ApolloProvider, Query, Mutation } from 'react-apollo'
import client from './client'
import { ADD_STAR, SEARCH_REPOSITORIES, REMOVE_STAR } from './graphql'

const StarCount = ({ node, query, first, last, before, after }) => {
  const totalCount = node.stargazers.totalCount
  const starCount = totalCount === 1 ? '1 star' : `${totalCount} stars`
  const viewerHasStarred = node.viewerHasStarred
  const StarStatus = ({ addOrRemoveStar }) => {
    const handleClick = () => {
      addOrRemoveStar({
        variables: { input: { starrableId: node.id } },
        update: (store, { data: { addStar, removeStar } }) => {
          console.log({ addStar, removeStar })
          const { starrable } = addStar || removeStar
          const data = store.readQuery({
            query: SEARCH_REPOSITORIES,
            variables: { query, first, last, before, after }
          })
          const { edges } = data.search
          const newEdges = edges.map(edge => {
            if (edge.node.id === node.id) {
              const totalCount = edge.node.stargazers.totalCount
              const diff = starrable.viewerHasStarred ? 1 : -1
              const newTotalCount = totalCount + diff
              edge.node.stargazers.totalCount = newTotalCount
            }
            return edge
          })
          data.search.edges = newEdges
          store.writeQuery({
            query: SEARCH_REPOSITORIES,
            data,
          })
        }
      })
    }

    return (
      <button onClick={handleClick}>
        {starCount} | {viewerHasStarred ? 'starred' : '-'}
      </button>
    )
  }

  return (
    <Mutation
      mutation={viewerHasStarred ? REMOVE_STAR : ADD_STAR}
    >
      {
        (addOrRemoveStar) => <StarStatus addOrRemoveStar={addOrRemoveStar} />
      }
    </Mutation>
  )
}

const PER_PAGE = 5
const DEFAULT_STATE = {
  first: PER_PAGE,
  after: null,
  last: null,
	before: null,
	query: "",
}

const App = () => {
  const [state, setState] = useState(DEFAULT_STATE)
  const { query, first, last, before, after } = state
  const inputRef = useRef(null)

  const handleSubmit = e => {
    e.preventDefault()

    setState({
      ...state,
      query: inputRef.current.value,
    })
  }

  const goNext = useCallback(search => {
    setState({
      ...state,
      first: PER_PAGE,
      after: search.pageInfo.endCursor,
      before: null,
      last: null,
    })
  }, [state])

  const goPrevious = useCallback(search => {
    setState({
      ...state,
      first: null,
      after: null,
      before: search.pageInfo.startCursor,
      last: PER_PAGE,
    })
  }, [state])

  return (
    <ApolloProvider client={client} >
      <form onSubmit={handleSubmit}>
        <input ref={inputRef} />
        <input type="submit" value="Submit" />
      </form>

      <Query
        query={SEARCH_REPOSITORIES}
        variables={{ query, first, last, before, after }}
      >
        {
          ({ loading, error, data }) => {
            if (loading) return `Loading...`
            if (error) return `Error! ${error.message}`

            console.log({ pageInfo: data.search.pageInfo })
            const search = data.search
            const repositoryCount = search.repositoryCount
            const repositoryUnit = repositoryCount === 1 ? 'Reposotory' : 'Repositories'
            const title = `Github Repositories Search Results - ${repositoryCount} ${repositoryUnit}`
            return (
              <>
                <h3>{title}</h3>
                <ul>
                  {
                    search.edges.map(edge => {
                      const node = edge.node
                      return (
                        <li key={node.id}>
                          <a target="_blank" rel="noopener noreferrer" href={node.url}>{node.name}</a>
                          &nbsp;
                          <StarCount
                            node={node}
                            {...{ query, first, last, before, after }}
                          />
                        </li>
                      )
                    })
                  }
                </ul>
                {
                  search.pageInfo.hasPreviousPage ?
                    <button onClick={() => goPrevious(search)}>Previous</button> :
                    null
                }
                {
                  search.pageInfo.hasNextPage ?
                    <button onClick={() => goNext(search)}>Next</button> :
                    null
                }
              </>
            )
          }
        }
      </Query>
    </ApolloProvider>
  )
}

export default App
