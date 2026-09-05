from flask import Flask
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
        return f"""
            <h1>Sistema de Becas IFARHU</h1>
            <p style="color: green;">Conexión exitosa a la base de datos.</p>
            <p>Estudiantes registrados: {total}</p>
        """
    except Exception as error:
        return f"""
            <h1>Sistema de Becas IFARHU</h1>
            <p style="color: red;">Error de conexión: {error}</p>
        """

if __name__ == "__main__":
    app.run(debug=True)