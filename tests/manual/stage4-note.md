# dg-plantuml stage 4 test note

For the manual test M-07 (design 16.3) and the coloured error excerpt. See stage4-manual-tests.md.

## 1. All kinds of tokens

```plantuml
@startuml
' a line comment
!theme cyborg
skinparam ArrowColor #FF0000
participant "Web server" as W
actor User
User -> W : request (this label is not coloured: class note ->)
W --> User : response
/' a block comment
   over two lines '/
class Customer #LightBlue
Customer <|-- Admin
Customer ..> Order
@enduml
```

## 2. Four backticks, tildes and the language name puml

````plantuml
note over A
  ```
  inside
  ```
end note
````

~~~puml
@startmindmap
* root
** child
@endmindmap
~~~

## 3. Other code blocks are not coloured by this plugin

```js
class Customer { start() { return 1; } }
```

```text
participant A -> B
```

## 4. Language name "uml" (coloured only when "Other language names" contains uml)

```uml
participant Alice
Alice -> Bob
```

## 5. Error: the line excerpt in the viewer is coloured

```plantuml
participant Alice
Alice -> Bob : hello
class Order #red ->> this is wrong
```
