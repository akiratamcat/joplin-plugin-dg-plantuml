# dg-plantuml release test note: CSS that loads external files (1.0.1)

For the additional check of version 1.0.1 (see release-manual-tests.ja.md, "v1.0.1 の追加の確認"). Each block puts CSS that would load an image from `example.com` into a place where a user writes a colour, a font or text. None of them may make a request: the Network tab of the developer tools must stay free of `example.com`.

## 1. skinparam defaultFontName — Expected: a diagram

```plantuml
skinparam defaultFontName red;mask-image:image-set('https://example.com/r101-1.png' 1x)
Alice -> Bob : font name
```

## 2. style FontName and BackGroundColor — Expected: a diagram

```plantuml
<style>
root {
  FontName red;mask-image:image-set('https://example.com/r101-2a.png' 1x)
  BackGroundColor url(https://example.com/r101-2b.png)
}
</style>
Alice -> Bob : style
```

## 3. Creole font and colour — Expected: a diagram (the colour markup may show as text)

```plantuml
Alice -> Bob : <font:red;mask-image:image-set('https://example.com/r101-3a.png' 1x)>font</font>
Alice -> Bob : <color:red;}svg{mask-image:image-set('https://example.com/r101-3b.png' 1x)}.x{fill:red>colour</color>
```

## 4. Title font — Expected: a diagram

```plantuml
title <font:red}svg{background-image:image-set('https://example.com/r101-4.png' 1x)}.x{fill:red>Title</font>
Alice -> Bob
```

## 5. Mind map node colour — Expected: a mind map (the colour markup shows as text)

```plantuml
@startmindmap
*[#red;mask-image:image-set('https://example.com/r101-5.png' 1x)] root
** child
@endmindmap
```

## 6. Element colour — Expected: a PlantUML error box (the engine refuses the colour)

```plantuml
class A #url(https://example.com/r101-6.png)
```

## 7. An ordinary diagram — Expected: a diagram with colours, as in 1.0.0

```plantuml
skinparam backgroundColor #FFFDE7
class Customer #LightBlue {
  +name : String
}
class Order #Pink
Customer "1" --> "*" Order : <color:red>places</color>
```
