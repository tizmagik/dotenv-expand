'use strict'

// like String.prototype.search but returns the last index
function _searchLast (str, rgx) {
  const matches = Array.from(str.matchAll(rgx))
  return matches.length > 0 ? matches.slice(-1)[0].index : -1
}

function _interpolate (value, processEnv, parsed) {
  // find the last unescaped dollar sign in the value to evaluate
  const lastUnescapedDollarSignIndex = _searchLast(value, /(?!(?<=\\))\$/g)

  // return early unless unescaped dollar sign
  if (lastUnescapedDollarSignIndex === -1) {
    return value
  }

  // This is the right-most group of variables in the string
  const rightMostGroup = value.slice(lastUnescapedDollarSignIndex)

  /**
   * This finds the inner most variable/group divided
   * by variable name and default value (if present)
   * (
   *   (?!(?<=\\))\$        // only match dollar signs that are not escaped
   *   {?                   // optional opening curly brace
   *     ([\w.]+)           // match the variable name
   *     (?::-([^}\\]*))?   // match an optional default value
   *   }?                   // optional closing curly brace
   * )
   */
  const matchGroup = /((?!(?<=\\))\${?([\w.]+)(?::-([^}\\]*))?}?)/
  const match = rightMostGroup.match(matchGroup)

  if (match != null) {
    const [, group, key, defaultValue] = match
    const replacementString = processEnv[key] || defaultValue || parsed[key] || ''
    const modifiedValue = value.replace(group, replacementString)

    // return early for scenario like process.env.PASSWORD = 'pas$word'
    if (processEnv[key] && modifiedValue === processEnv[key]) {
      return modifiedValue
    }

    return _interpolate(modifiedValue, processEnv, parsed)
  }

  return value
}

function _resolveEscapeSequences (value) {
  return value.replace(/\\\$/g, '$')
}

function expand (config) {
  // if ignoring process.env, use a blank object
  const processEnv = config.ignoreProcessEnv ? {} : process.env

  for (const key in config.parsed) {
    let value = config.parsed[key]

    // don't interpolate the processEnv value if it exists there already
    if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
      value = processEnv[key]
    } else {
      value = _interpolate(value, processEnv, config.parsed)
    }

    config.parsed[key] = _resolveEscapeSequences(value)
  }

  for (const processKey in config.parsed) {
    processEnv[processKey] = config.parsed[processKey]
  }

  return config
}

module.exports.expand = expand
