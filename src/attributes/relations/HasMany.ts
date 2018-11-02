import { Schema as NormalizrSchema } from 'normalizr'
import Schema from '../../schema/Schema'
import { Record, NormalizedData } from '../../data'
import Model from '../../model/Model'
import Query from '../../query/Query'
import Relation from './Relation'

export default class HasMany extends Relation {
  /**
   * The related model.
   */
  related: typeof Model

  /**
   * The foregin key of the related model.
   */
  foreignKey: string

  /**
   * The local key of the model.
   */
  localKey: string

  /**
   * Create a new has many instance.
   */
  constructor (model: typeof Model, related: typeof Model | string, foreignKey: string, localKey: string) {
    super(model) /* istanbul ignore next */

    this.related = this.model.relation(related)
    this.foreignKey = foreignKey
    this.localKey = localKey
  }

  /**
   * Define the normalizr schema for the relationship.
   */
  define (schema: Schema): NormalizrSchema {
    return schema.many(this.related)
  }

  /**
   * Attach the relational key to the given data.
   */
  attach (key: any, record: Record, data: NormalizedData): void {
    if (!Array.isArray(key)) {
      return
    }

    key.forEach((index: any) => {
      const related = data[this.related.entity]

      if (!related || !related[index] || related[index][this.foreignKey] !== undefined) {
        return
      }

      related[index][this.foreignKey] = record.$id
    })
  }

  /**
   * Convert given value to the appropriate value for the attribute.
   */
  make (value: any, _parent: Record, _key: string): Model[] {
    return this.makeManyRelation(value, this.related)
  }

  /**
   * Load the has many relationship for the collection.
   */
  load (query: Query, collection: Record[], key: string, lazy: boolean): void {
    const relatedQuery = this.getRelation(query, this.related.entity)

    relatedQuery.where(this.foreignKey, this.getKeys(collection, this.localKey))

    const relations = this.mapManyRelations(relatedQuery.get(), this.foreignKey)

    collection.forEach((item) => {

      const handler = {
        loadme: () => relations[item[this.localKey]],
        loaded: false,
        items: <any>[],
        get: function(target: any, prop: any)  {
          if(!this.loaded && target.length === 0) {
            this.items = this.loadme()
            this.loaded = true
          }

          return this.items[prop]
        },

        set: function(target: any, key: any, value: any)  {
          if(target.length === 0) target = this.items
          this.items[key] = value
          return true
        }
      }
      const related = lazy ? new Proxy([], handler) : relations[item[this.localKey]]

      item[key] = related || []
    })
  }
}
