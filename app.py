from flask import Flask, render_template
from conexion import obtener_conexion

app = Flask(__name__)

@app.route("/")
def inicio():
    try:
        conexion = obtener_conexion()
        cursor = conexion.cursor()
        cursor.execute("SELECT COUNT(*) FROM estudiantes")
        total = cursor.fetchone()[0]
        cursor.close()
        conexion.close()
        return render_template("index.html", mensaje="Conexión exitosa a la base de datos.", total=total)
    except Exception as error:
        return render_template("index.html", mensaje=f"Error de conexión: {error}", total=0)

if __name__ == "__main__":
    app.run(debug=True)