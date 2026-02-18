  A real engine, in JavaScript with:

1. Define ALL the Features in the game....
2. Design the Navigation using all those features...
3. Define the files and folder needed for best results...
4. Define the Directory tree of folders and files...
5. Start coding in JavaScript only

clean modules

bitboards

perfect movegen

scalable eval

professional search

no UI entanglement

no garbage

no rewrites later

final file structure..../engine
  engine.js

  /core
    constants.js
    bitboards.js
    position.js
    movegen.js
    perft.js

  /search
    search.js
    tt.js
    ordering.js
    stack.js

  /eval
    eval.js
    nnue.js

/web
  index.html
  styles.css
  ui.js
  worker.js

